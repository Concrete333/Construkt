import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { MockConstruktClient } from "../lib/mockClient";
import { seedHospitalFitOut } from "../lib/mockSeed";
import { selectAuditTimeline } from "./auditSelectors";

const PROGRAM_ID = new PublicKey(
  "cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4",
);

let clockTick = 1_700_000_000n;

const advancingClock = () => clockTick++;

const seedWithAdvancingClock = async () => {
  clockTick = 1_700_000_000n;
  const client = new MockConstruktClient({
    programId: PROGRAM_ID,
    clock: advancingClock,
  });
  const world = await seedHospitalFitOut(client, { programId: PROGRAM_ID });
  const project = (await client.fetchProjects())[0];
  const packages = await client.fetchWorkPackagesForProject(world.project);
  const roleAssignments = (
    await Promise.all(
      packages.map((p) => client.fetchRoleAssignmentsForPackage(p.address)),
    )
  ).flat();
  const paymentRequests = (
    await Promise.all(
      packages.map((p) => client.fetchPaymentRequestsForPackage(p.address)),
    )
  ).flat();
  const approvals = (
    await Promise.all(
      paymentRequests.map((pr) => client.fetchApprovalsForRequest(pr.address)),
    )
  ).flat();
  return {
    world,
    project,
    roleAssignments,
    paymentRequests,
    approvals,
  };
};

describe("selectAuditTimeline", () => {
  it("starts with the projectCreated event", async () => {
    const sources = await seedWithAdvancingClock();
    const timeline = selectAuditTimeline(sources);
    expect(timeline[0].kind).toBe("projectCreated");
    expect(timeline[0].label).toMatch(/Demo Hospital Fit-Out/);
  });

  it("emits a roleAssigned event for every role assignment", async () => {
    const sources = await seedWithAdvancingClock();
    const timeline = selectAuditTimeline(sources);
    const roles = timeline.filter((e) => e.kind === "roleAssigned");
    // 6 packages × 3 roles each
    expect(roles).toHaveLength(18);
  });

  it("emits exactly one requestSubmitted event per payment request", async () => {
    const sources = await seedWithAdvancingClock();
    const timeline = selectAuditTimeline(sources);
    const submitted = timeline.filter((e) => e.kind === "requestSubmitted");
    // foundation, steelFrame, mepFirstFix, facade, rejectedDelta — five total
    expect(submitted).toHaveLength(5);
  });

  it("emits a requestReleased event only for the foundation request", async () => {
    const sources = await seedWithAdvancingClock();
    const timeline = selectAuditTimeline(sources);
    const released = timeline.filter((e) => e.kind === "requestReleased");
    expect(released).toHaveLength(1);
    expect(released[0].paymentRequestAddress?.toBase58()).toBe(
      sources.world.packages.foundation.request!.toBase58(),
    );
  });

  it("emits a requestRejected event for the rejected request", async () => {
    const sources = await seedWithAdvancingClock();
    const timeline = selectAuditTimeline(sources);
    const rejected = timeline.filter((e) => e.kind === "requestRejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0].paymentRequestAddress?.toBase58()).toBe(
      sources.world.packages.rejectedDelta.request!.toBase58(),
    );
  });

  it("emits a holdActive event only while a hold is currently in place", async () => {
    const sources = await seedWithAdvancingClock();
    const timeline = selectAuditTimeline(sources);
    const holds = timeline.filter((e) => e.kind === "holdActive");
    expect(holds).toHaveLength(1);
    expect(holds[0].paymentRequestAddress?.toBase58()).toBe(
      sources.world.packages.facade.request!.toBase58(),
    );
  });

  it("emits both PM and Director approval events for the foundation request", async () => {
    const sources = await seedWithAdvancingClock();
    const timeline = selectAuditTimeline(sources);
    const foundation = sources.world.packages.foundation.request!.toBase58();
    const approvals = timeline.filter(
      (e) =>
        e.paymentRequestAddress?.toBase58() === foundation &&
        (e.kind === "requestLowApproved" || e.kind === "requestHighApproved"),
    );
    expect(approvals).toHaveLength(2);
  });

  it("returns events in non-decreasing timestamp order", async () => {
    const sources = await seedWithAdvancingClock();
    const timeline = selectAuditTimeline(sources);
    for (let i = 1; i < timeline.length; i += 1) {
      expect(timeline[i].at >= timeline[i - 1].at).toBe(true);
    }
  });

  it("returns an empty timeline when there are no requests or approvals", () => {
    const project = {
      address: PublicKey.default,
      account: {
        authority: PublicKey.default,
        projectId: 1n,
        mint: PublicKey.default,
        budgetAmount: 1_000_000n,
        allocatedAmount: 0n,
        name: "Empty",
        status: "active" as const,
        createdAt: 1_700_000_000n,
        metadataRef: "",
        bump: 0,
      },
    };
    const timeline = selectAuditTimeline({
      project,
      roleAssignments: [],
      paymentRequests: [],
      approvals: [],
    });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].kind).toBe("projectCreated");
  });
});
