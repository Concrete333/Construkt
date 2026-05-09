import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { MockConstruktClient } from "../lib/mockClient";
import { seedHospitalFitOut } from "../lib/mockSeed";
import {
  paymentRequestDisplayStatus,
  paymentRequestStatusLabel,
  paymentRequestChipTone,
  releaseBlockedReasonLabel,
  selectApprovalTracker,
  selectPaymentRequestSummary,
  selectReleaseReadiness,
} from "./paymentSelectors";
import type { PaymentRequestAccount, WorkPackageAccount } from "../lib/program";

const PROGRAM_ID = new PublicKey("cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4");

const seed = async () => {
  const client = new MockConstruktClient({
    programId: PROGRAM_ID,
    clock: () => 1_700_000_000n,
  });
  const world = await seedHospitalFitOut(client, { programId: PROGRAM_ID });
  return { client, world };
};

const fetchTriple = async (
  client: MockConstruktClient,
  workPackage: PublicKey,
  paymentRequest: PublicKey,
) => {
  const wp = (await client.fetchWorkPackage(workPackage))!;
  const pr = (await client.fetchPaymentRequest(paymentRequest))!;
  const approvals = await client.fetchApprovalsForRequest(paymentRequest);
  return { wp, pr, approvals };
};

describe("paymentRequestDisplayStatus", () => {
  it("collapses status + holdActive into a single discriminated value", () => {
    const base: Pick<PaymentRequestAccount, "status" | "holdActive"> = {
      status: "submitted",
      holdActive: false,
    };
    expect(paymentRequestDisplayStatus(base)).toBe("submitted");
    expect(paymentRequestDisplayStatus({ ...base, holdActive: true })).toBe(
      "submittedOnHold",
    );
    expect(
      paymentRequestDisplayStatus({ status: "lowApproved", holdActive: true }),
    ).toBe("lowApprovedOnHold");
    expect(
      paymentRequestDisplayStatus({ status: "highApproved", holdActive: true }),
    ).toBe("highApprovedOnHold");
  });

  it("ignores holdActive on terminal states", () => {
    expect(
      paymentRequestDisplayStatus({ status: "released", holdActive: true }),
    ).toBe("released");
    expect(
      paymentRequestDisplayStatus({ status: "rejected", holdActive: true }),
    ).toBe("rejected");
  });
});

describe("paymentRequestStatusLabel + chipTone", () => {
  it("returns a non-empty human label for every display state", () => {
    const states = [
      "submitted",
      "submittedOnHold",
      "lowApproved",
      "lowApprovedOnHold",
      "highApproved",
      "highApprovedOnHold",
      "released",
      "rejected",
    ] as const;
    for (const s of states) {
      expect(paymentRequestStatusLabel(s).length).toBeGreaterThan(0);
      expect(paymentRequestChipTone(s)).toMatch(
        /^(neutral|warning|info|success|error)$/,
      );
    }
  });

  it("uses success tone for released and error tone for rejected", () => {
    expect(paymentRequestChipTone("released")).toBe("success");
    expect(paymentRequestChipTone("rejected")).toBe("error");
  });

  it("uses warning tone for any on-hold state", () => {
    expect(paymentRequestChipTone("submittedOnHold")).toBe("warning");
    expect(paymentRequestChipTone("lowApprovedOnHold")).toBe("warning");
    expect(paymentRequestChipTone("highApprovedOnHold")).toBe("warning");
  });
});

describe("selectApprovalTracker", () => {
  it("marks both approvers pending when there are no records", () => {
    const tracker = selectApprovalTracker([]);
    expect(tracker.lowApprover.state).toBe("pending");
    expect(tracker.highApprover.state).toBe("pending");
    expect(tracker.lowApprover.approver).toBeNull();
  });

  it("captures both approvals on the foundation request", async () => {
    const { client, world } = await seed();
    const approvals = await client.fetchApprovalsForRequest(
      world.packages.foundation.request!,
    );
    const tracker = selectApprovalTracker(approvals);
    expect(tracker.lowApprover.state).toBe("approved");
    expect(tracker.lowApprover.approver?.toBase58()).toBe(
      world.pm.publicKey.toBase58(),
    );
    expect(tracker.highApprover.state).toBe("approved");
    expect(tracker.highApprover.approver?.toBase58()).toBe(
      world.director.publicKey.toBase58(),
    );
  });

  it("captures a rejection on the rejectedDelta request", async () => {
    const { client, world } = await seed();
    const approvals = await client.fetchApprovalsForRequest(
      world.packages.rejectedDelta.request!,
    );
    const tracker = selectApprovalTracker(approvals);
    expect(tracker.lowApprover.state).toBe("rejected");
    expect(tracker.highApprover.state).toBe("pending");
  });
});

describe("selectReleaseReadiness", () => {
  it("returns ready=true for the highApproved package", async () => {
    const { client, world } = await seed();
    const { wp, pr } = await fetchTriple(
      client,
      world.packages.steelFrame.address,
      world.packages.steelFrame.request!,
    );
    expect(selectReleaseReadiness(pr, wp)).toEqual({
      ready: true,
      reasons: [],
    });
  });

  it("returns ready=true for the lowApproved package", async () => {
    const { client, world } = await seed();
    const { wp, pr } = await fetchTriple(
      client,
      world.packages.mepFirstFix.address,
      world.packages.mepFirstFix.request!,
    );
    expect(selectReleaseReadiness(pr, wp)).toEqual({
      ready: true,
      reasons: [],
    });
  });

  it("blocks on OnHold for the held facade request", async () => {
    const { client, world } = await seed();
    const { wp, pr } = await fetchTriple(
      client,
      world.packages.facade.address,
      world.packages.facade.request!,
    );
    const r = selectReleaseReadiness(pr, wp);
    expect(r.ready).toBe(false);
    expect(r.reasons).toContain("OnHold");
  });

  it("blocks on AlreadyReleased for the foundation request", async () => {
    const { client, world } = await seed();
    const { wp, pr } = await fetchTriple(
      client,
      world.packages.foundation.address,
      world.packages.foundation.request!,
    );
    const r = selectReleaseReadiness(pr, wp);
    expect(r.ready).toBe(false);
    expect(r.reasons).toContain("AlreadyReleased");
  });

  it("blocks rejected requests with a specific reason", async () => {
    const { client, world } = await seed();
    const { wp, pr } = await fetchTriple(
      client,
      world.packages.rejectedDelta.address,
      world.packages.rejectedDelta.request!,
    );
    const r = selectReleaseReadiness(pr, wp);
    expect(r.ready).toBe(false);
    expect(r.reasons).toContain("RequestRejected");
    expect(releaseBlockedReasonLabel("RequestRejected")).toMatch(/rejected/i);
  });

  it("blocks low-only release with HighApprovalRequired when the package requires high approval", () => {
    const wp: WorkPackageAccount = {
      project: PublicKey.default,
      packageId: 1n,
      capAmount: 1_000n,
      fundedAmount: 1_000n,
      releasedAmount: 0n,
      reservedRequestAmount: 0n,
      allocatedMilestoneAmount: 0n,
      milestoneCounter: 0n,
      contractor: PublicKey.default,
      mint: PublicKey.default,
      vault: PublicKey.default,
      vaultAuthorityBump: 0,
      status: "active",
      scopeRef: "",
      requestCounter: 1n,
      hasActiveRequest: true,
      activeRequest: PublicKey.default,
      highApprovalRequired: true,
      bump: 0,
    };
    const lowApprovedRequest: PaymentRequestAccount = {
      workPackage: PublicKey.default,
      requestId: 1n,
      contractor: PublicKey.default,
      amount: 100n,
      hasMilestone: false,
      milestone: PublicKey.default,
      documentRef: "x",
      status: "lowApproved",
      submittedAt: 0n,
      updatedAt: 0n,
      releasedAmount: 0n,
      holdActive: false,
      holdBy: PublicKey.default,
      holdRef: "",
      bump: 0,
    };
    const blocked = selectReleaseReadiness(lowApprovedRequest, wp);
    expect(blocked.ready).toBe(false);
    expect(blocked.reasons).toContain("HighApprovalRequired");
    expect(releaseBlockedReasonLabel("HighApprovalRequired")).toMatch(
      /director.*high.*approval/i,
    );

    const highApprovedRequest = {
      ...lowApprovedRequest,
      status: "highApproved" as const,
    };
    const ready = selectReleaseReadiness(highApprovedRequest, wp);
    expect(ready.ready).toBe(true);
    expect(ready.reasons).not.toContain("HighApprovalRequired");
  });

  it("flags InsufficientRemainingCap and InsufficientFundedRemaining when amount exceeds budgets", () => {
    const wp: WorkPackageAccount = {
      project: PublicKey.default,
      packageId: 1n,
      capAmount: 100n,
      fundedAmount: 50n,
      releasedAmount: 20n,
      reservedRequestAmount: 0n,
      allocatedMilestoneAmount: 0n,
      milestoneCounter: 0n,
      contractor: PublicKey.default,
      mint: PublicKey.default,
      vault: PublicKey.default,
      vaultAuthorityBump: 0,
      status: "active",
      scopeRef: "",
      requestCounter: 1n,
      hasActiveRequest: true,
      activeRequest: PublicKey.default,
      highApprovalRequired: false,
      bump: 0,
    };
    const pr: PaymentRequestAccount = {
      workPackage: PublicKey.default,
      requestId: 1n,
      contractor: PublicKey.default,
      amount: 1_000n,
      hasMilestone: false,
      milestone: PublicKey.default,
      documentRef: "x",
      status: "highApproved",
      submittedAt: 0n,
      updatedAt: 0n,
      releasedAmount: 0n,
      holdActive: false,
      holdBy: PublicKey.default,
      holdRef: "",
      bump: 0,
    };
    const r = selectReleaseReadiness(pr, wp);
    expect(r.reasons).toContain("InsufficientRemainingCap");
    expect(r.reasons).toContain("InsufficientFundedRemaining");
  });
});

describe("selectPaymentRequestSummary", () => {
  it("composes all fields for the steelFrame request", async () => {
    const { client, world } = await seed();
    const { wp, pr, approvals } = await fetchTriple(
      client,
      world.packages.steelFrame.address,
      world.packages.steelFrame.request!,
    );
    const summary = selectPaymentRequestSummary(pr, wp, approvals);
    expect(summary.displayStatus).toBe("highApproved");
    expect(summary.statusLabel).toMatch(/High approver cleared/);
    expect(summary.chipTone).toBe("info");
    expect(summary.approvals.lowApprover.state).toBe("approved");
    expect(summary.approvals.highApprover.state).toBe("approved");
    expect(summary.releaseReadiness.ready).toBe(true);
    expect(summary.isTerminal).toBe(false);
  });

  it("marks released and rejected requests as terminal", async () => {
    const { client, world } = await seed();
    const released = await fetchTriple(
      client,
      world.packages.foundation.address,
      world.packages.foundation.request!,
    );
    const rejected = await fetchTriple(
      client,
      world.packages.rejectedDelta.address,
      world.packages.rejectedDelta.request!,
    );
    const releasedSummary = selectPaymentRequestSummary(
      released.pr,
      released.wp,
      released.approvals,
    );
    const rejectedSummary = selectPaymentRequestSummary(
      rejected.pr,
      rejected.wp,
      rejected.approvals,
    );
    expect(releasedSummary.isTerminal).toBe(true);
    expect(rejectedSummary.isTerminal).toBe(true);
  });
});
