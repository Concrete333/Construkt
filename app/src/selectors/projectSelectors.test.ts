import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import { MockConstruktClient } from "../lib/mockClient";
import { seedHospitalFitOut } from "../lib/mockSeed";
import {
  filterProjectsByContractor,
  projectStatusLabel,
  selectPackageRollup,
  selectProjectRollup,
  workPackageStatusLabel,
} from "./projectSelectors";
import type { Fetched, WorkPackageAccount } from "../lib/program";

const PROGRAM_ID = new PublicKey("cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4");

const seedAndFetch = async () => {
  const client = new MockConstruktClient({
    programId: PROGRAM_ID,
    clock: () => 1_700_000_000n,
  });
  const world = await seedHospitalFitOut(client, { programId: PROGRAM_ID });
  const projects = await client.fetchProjects();
  const packages = await client.fetchWorkPackagesForProject(world.project);
  return { client, world, projects, packages };
};

const buildRollupsFor = async (
  client: MockConstruktClient,
  packages: Fetched<WorkPackageAccount>[],
) => {
  return Promise.all(
    packages.map(async (pkg) => {
      const active = pkg.account.hasActiveRequest
        ? await client.fetchPaymentRequest(pkg.account.activeRequest)
        : null;
      return selectPackageRollup(pkg, active);
    }),
  );
};

describe("selectPackageRollup", () => {
  it("computes balances and active-request flags for the foundation package", async () => {
    const { client, world } = await seedAndFetch();
    const fetched = (
      await client.fetchWorkPackagesForProject(world.project)
    ).find((p) => p.address.equals(world.packages.foundation.address))!;
    const rollup = selectPackageRollup(fetched, null);
    expect(rollup.package.releasedAmount).toBe(rollup.package.capAmount);
    expect(rollup.unreleasedAgainstCap).toBe(0n);
    expect(rollup.outstandingFunded).toBe(0n);
    expect(rollup.hasActiveRequest).toBe(false);
    expect(rollup.activeRequest).toBeNull();
  });

  it("flags the facade package as held", async () => {
    const { client, world } = await seedAndFetch();
    const fetched = (
      await client.fetchWorkPackagesForProject(world.project)
    ).find((p) => p.address.equals(world.packages.facade.address))!;
    const activeRequest = await client.fetchPaymentRequest(
      fetched.account.activeRequest,
    );
    const rollup = selectPackageRollup(fetched, activeRequest);
    expect(rollup.hasActiveRequest).toBe(true);
    expect(rollup.isHeld).toBe(true);
  });

  it("returns null active request when the package has none", async () => {
    const { client, world } = await seedAndFetch();
    const fetched = (
      await client.fetchWorkPackagesForProject(world.project)
    ).find((p) => p.address.equals(world.packages.interior.address))!;
    const rollup = selectPackageRollup(fetched, null);
    expect(rollup.hasActiveRequest).toBe(false);
    expect(rollup.activeRequest).toBeNull();
    expect(rollup.isHeld).toBe(false);
  });
});

describe("selectProjectRollup", () => {
  it("aggregates totals and per-status counts from package rollups", async () => {
    const { client, projects, packages } = await seedAndFetch();
    const rollups = await buildRollupsFor(client, packages);
    const summary = selectProjectRollup(projects[0], rollups);

    expect(summary.packageCount).toBe(6);
    // foundation released its full cap → completed; the other five stay active.
    expect(summary.activePackageCount).toBe(5);
    expect(summary.completedPackageCount).toBe(1);
    expect(summary.cancelledPackageCount).toBe(0);
    // foundation released; rejectedDelta is unblocked; interior has none —
    // leaves steelFrame, mepFirstFix, facade with active requests.
    expect(summary.packagesWithActiveRequest).toBe(3);
    expect(summary.heldPackageCount).toBe(1);

    const totalCap = rollups.reduce((a, b) => a + b.package.capAmount, 0n);
    const totalFunded = rollups.reduce(
      (a, b) => a + b.package.fundedAmount,
      0n,
    );
    const totalReleased = rollups.reduce(
      (a, b) => a + b.package.releasedAmount,
      0n,
    );
    expect(summary.projectBudget).toBe(projects[0].account.budgetAmount);
    expect(summary.allocatedPackageBudget).toBe(
      projects[0].account.allocatedAmount,
    );
    expect(summary.remainingAllocatableBudget).toBe(
      projects[0].account.budgetAmount - projects[0].account.allocatedAmount,
    );
    expect(summary.totalCap).toBe(totalCap);
    expect(summary.totalFunded).toBe(totalFunded);
    expect(summary.totalReleased).toBe(totalReleased);
    expect(summary.totalOutstandingFunded).toBe(totalFunded - totalReleased);
    expect(summary.totalUnreleasedAgainstCap).toBe(totalCap - totalReleased);
  });

  it("returns zeroed totals for a project with no packages", () => {
    const project = {
      address: PublicKey.default,
      account: {
        authority: PublicKey.default,
        projectId: 1n,
        mint: PublicKey.default,
        budgetAmount: 2_000_000n,
        allocatedAmount: 0n,
        name: "Empty",
        status: "active" as const,
        createdAt: 0n,
        metadataRef: "",
        bump: 0,
      },
    };
    const summary = selectProjectRollup(project, []);
    expect(summary.packageCount).toBe(0);
    expect(summary.projectBudget).toBe(2_000_000n);
    expect(summary.allocatedPackageBudget).toBe(0n);
    expect(summary.remainingAllocatableBudget).toBe(2_000_000n);
    expect(summary.totalCap).toBe(0n);
    expect(summary.totalFunded).toBe(0n);
    expect(summary.totalReleased).toBe(0n);
  });
});

describe("status labels", () => {
  it("provides labels for every project status", () => {
    expect(projectStatusLabel("active")).toBe("Active");
    expect(projectStatusLabel("completed")).toBe("Completed");
    expect(projectStatusLabel("cancelled")).toBe("Cancelled");
  });
  it("provides labels for every package status", () => {
    expect(workPackageStatusLabel("active")).toBe("Active");
    expect(workPackageStatusLabel("completed")).toBe("Completed");
    expect(workPackageStatusLabel("cancelled")).toBe("Cancelled");
  });
});

describe("filterProjectsByContractor", () => {
  it("returns the project when the contractor has a role on at least one package", async () => {
    const { world, projects, packages } = await seedAndFetch();
    const map = new Map([[world.project.toBase58(), packages]]);
    const visible = filterProjectsByContractor(
      projects,
      map,
      world.contractor.publicKey,
    );
    expect(visible).toHaveLength(1);
  });

  it("hides the project from a contractor with no assignments", async () => {
    const { world, projects, packages } = await seedAndFetch();
    const map = new Map([[world.project.toBase58(), packages]]);
    const stranger = Keypair.generate().publicKey;
    const visible = filterProjectsByContractor(projects, map, stranger);
    expect(visible).toHaveLength(0);
  });
});
