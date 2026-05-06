import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { MockConstruktClient } from "./mockClient";
import { seedHospitalFitOut } from "./mockSeed";

const PROGRAM_ID = new PublicKey(
  "34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL",
);

const newClient = (): MockConstruktClient =>
  new MockConstruktClient({
    programId: PROGRAM_ID,
    clock: () => 1_700_000_000n,
  });

const seed = async () => {
  const client = newClient();
  const world = await seedHospitalFitOut(client, { programId: PROGRAM_ID });
  return { client, world };
};

describe("seedHospitalFitOut — shape", () => {
  it("creates one project owned by the finance demo wallet", async () => {
    const { client, world } = await seed();
    const projects = await client.fetchProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].account.authority.toBase58()).toBe(
      world.finance.publicKey.toBase58(),
    );
    expect(projects[0].account.name).toBe("Demo Hospital Fit-Out");
  });

  it("creates six work packages under the project", async () => {
    const { client, world } = await seed();
    const packages = await client.fetchWorkPackagesForProject(world.project);
    expect(packages).toHaveLength(6);
  });

  it("creates five payment requests (interior has none)", async () => {
    const { client, world } = await seed();
    const packages = await client.fetchWorkPackagesForProject(world.project);
    const requestCounts = await Promise.all(
      packages.map(
        async (p) =>
          (await client.fetchPaymentRequestsForPackage(p.address)).length,
      ),
    );
    expect(requestCounts.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("assigns contractor + LowApprover + HighApprover on every package", async () => {
    const { client, world } = await seed();
    const packages = await client.fetchWorkPackagesForProject(world.project);
    for (const p of packages) {
      const roles = await client.fetchRoleAssignmentsForPackage(p.address);
      const roleNames = roles.map((r) => r.account.role).sort();
      expect(roleNames).toEqual(["contractor", "highApprover", "lowApprover"]);
    }
  });
});

describe("seedHospitalFitOut — per-package final state", () => {
  it("foundation is released and the package is marked completed", async () => {
    const { client, world } = await seed();
    const request = await client.fetchPaymentRequest(
      world.packages.foundation.request!,
    );
    const wp = await client.fetchWorkPackage(world.packages.foundation.address);
    expect(request?.status).toBe("released");
    expect(request?.releasedAmount).toBe(request?.amount);
    expect(wp?.status).toBe("completed");
    expect(wp?.releasedAmount).toBe(wp?.capAmount);
  });

  it("steelFrame is highApproved and waiting on finance", async () => {
    const { client, world } = await seed();
    const request = await client.fetchPaymentRequest(
      world.packages.steelFrame.request!,
    );
    expect(request?.status).toBe("highApproved");
    expect(request?.holdActive).toBe(false);
  });

  it("mepFirstFix is lowApproved and waiting on director", async () => {
    const { client, world } = await seed();
    const request = await client.fetchPaymentRequest(
      world.packages.mepFirstFix.request!,
    );
    expect(request?.status).toBe("lowApproved");
  });

  it("facade is submitted and on hold", async () => {
    const { client, world } = await seed();
    const request = await client.fetchPaymentRequest(
      world.packages.facade.request!,
    );
    expect(request?.status).toBe("submitted");
    expect(request?.holdActive).toBe(true);
    expect(request?.holdBy.toBase58()).toBe(world.finance.publicKey.toBase58());
  });

  it("interior has no payment request and the package stays active", async () => {
    const { client, world } = await seed();
    const wp = await client.fetchWorkPackage(world.packages.interior.address);
    expect(wp?.status).toBe("active");
    expect(wp?.hasActiveRequest).toBe(false);
    expect(world.packages.interior.request).toBeNull();
    const requests = await client.fetchPaymentRequestsForPackage(
      world.packages.interior.address,
    );
    expect(requests).toHaveLength(0);
  });

  it("rejectedDelta has a rejected request and the package is unblocked", async () => {
    const { client, world } = await seed();
    const request = await client.fetchPaymentRequest(
      world.packages.rejectedDelta.request!,
    );
    const wp = await client.fetchWorkPackage(
      world.packages.rejectedDelta.address,
    );
    expect(request?.status).toBe("rejected");
    expect(wp?.hasActiveRequest).toBe(false);
  });
});

describe("seedHospitalFitOut — approval records", () => {
  it("foundation has both LowApprover and HighApprover approval records", async () => {
    const { client, world } = await seed();
    const approvals = await client.fetchApprovalsForRequest(
      world.packages.foundation.request!,
    );
    const roles = approvals.map((a) => a.account.role).sort();
    expect(roles).toEqual(["highApprover", "lowApprover"]);
    expect(approvals.every((a) => a.account.decision === "approved")).toBe(
      true,
    );
  });

  it("rejectedDelta has a single LowApprover record with decision=rejected", async () => {
    const { client, world } = await seed();
    const approvals = await client.fetchApprovalsForRequest(
      world.packages.rejectedDelta.request!,
    );
    expect(approvals).toHaveLength(1);
    expect(approvals[0].account.role).toBe("lowApprover");
    expect(approvals[0].account.decision).toBe("rejected");
  });
});

describe("seedHospitalFitOut — determinism", () => {
  it("produces identical addresses across two independent runs", async () => {
    const a = await seed();
    const b = await seed();
    expect(a.world.project.toBase58()).toBe(b.world.project.toBase58());
    expect(a.world.packages.foundation.address.toBase58()).toBe(
      b.world.packages.foundation.address.toBase58(),
    );
    expect(a.world.finance.publicKey.toBase58()).toBe(
      b.world.finance.publicKey.toBase58(),
    );
  });
});
