import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { MockMetadataClient } from "../lib/metadataClient";
import { seedDemoMetadata } from "../lib/metadataSeed";
import { MockConstruktClient } from "../lib/mockClient";
import { seedHospitalFitOut } from "../lib/mockSeed";
import { withdrawalClearanceMetadataRef } from "../lib/ids";
import { selectPackageRollup, selectProjectRollup } from "./projectSelectors";
import {
  isWithdrawalCleared,
  selectDashboardSummary,
} from "./dashboardSelectors";
import type { DashboardProjectSource } from "./dashboardSelectors";
import type { Fetched, PaymentRequestAccount } from "../lib/program";

const PROGRAM_ID = new PublicKey("cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4");

const seedSources = async (): Promise<{
  source: DashboardProjectSource;
  foundationRequest: Fetched<PaymentRequestAccount>;
}> => {
  const client = new MockConstruktClient({
    programId: PROGRAM_ID,
    clock: () => 1_700_000_000n,
  });
  const world = await seedHospitalFitOut(client, { programId: PROGRAM_ID });
  const metadata = new MockMetadataClient();
  seedDemoMetadata(metadata, world);
  const project = (await client.fetchProjects())[0];
  const packages = await client.fetchWorkPackagesForProject(world.project);
  const packageSources = [];
  let foundationRequest: Fetched<PaymentRequestAccount> | null = null;

  for (const pkg of packages) {
    const requests = await client.fetchPaymentRequestsForPackage(pkg.address);
    const active = pkg.account.hasActiveRequest
      ? (requests.find((r) => r.address.equals(pkg.account.activeRequest))
          ?.account ?? null)
      : null;
    const rollup = selectPackageRollup(pkg, active);
    const documentRequests = (
      await metadata.listDocumentRequestsForPackage(pkg.address.toBase58())
    ).map(([, data]) => data);
    const withdrawalClearances = (
      await metadata.listWithdrawalClearancesForPackage(pkg.address.toBase58())
    ).map(([, data]) => data);
    packageSources.push({
      rollup,
      requests,
      documentRequests,
      withdrawalClearances,
    });
    if (pkg.address.equals(world.packages.foundation.address)) {
      foundationRequest = requests[0];
    }
  }

  const rollup = selectProjectRollup(
    project,
    packageSources.map((pkg) => pkg.rollup),
  );
  return {
    source: { rollup, packages: packageSources },
    foundationRequest: foundationRequest!,
  };
};

describe("selectDashboardSummary", () => {
  it("derives Phase 6 dashboard metrics from chain state plus metadata", async () => {
    const { source } = await seedSources();
    const summary = selectDashboardSummary([source]);

    expect(summary.projectCount).toBe(1);
    expect(summary.packageCount).toBe(7);
    expect(summary.totalProjectBudget).toBe(source.rollup.projectBudget);
    expect(summary.totalAllocatedPackageBudget).toBe(
      source.rollup.allocatedPackageBudget,
    );
    expect(summary.totalFunded).toBe(source.rollup.totalFunded);
    expect(summary.totalReleased).toBe(source.rollup.totalReleased);
    expect(summary.totalRequested).toBe(800_000_000n);
    expect(summary.totalApproved).toBe(600_000_000n);
    expect(summary.heldAmount).toBe(200_000_000n);
    expect(summary.activeRequestCount).toBe(4);
    expect(summary.heldRequestCount).toBe(1);
    expect(summary.evidenceAwaitingReviewCount).toBe(1);
    expect(summary.documentRequestsOutstandingCount).toBe(1);
    expect(summary.contractorWithdrawalBalance).toBe(200_000_000n);
  });

  it("subtracts released payments once withdrawal metadata marks them cleared", async () => {
    const { source, foundationRequest } = await seedSources();
    const foundation = source.packages.find((pkg) =>
      pkg.rollup.address.equals(foundationRequest.account.workPackage),
    )!;
    foundation.withdrawalClearances.push({
      workPackage: foundation.rollup.address.toBase58(),
      paymentRequest: foundationRequest.address.toBase58(),
      amount: foundationRequest.account.releasedAmount,
      clearedByDisplayName: "Daniel Okafor",
      clearedByRole: "contractor",
      clearedAt: "2026-04-21T09:00:00Z",
    });

    expect(
      isWithdrawalCleared(foundationRequest, foundation.withdrawalClearances),
    ).toBe(true);
    expect(withdrawalClearanceMetadataRef(foundationRequest.address)).toMatch(
      foundationRequest.address.toBase58(),
    );
    expect(selectDashboardSummary([source]).contractorWithdrawalBalance).toBe(
      0n,
    );
  });
});
