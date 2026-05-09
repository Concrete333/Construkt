import type {
  DocumentRequestMetadata,
  WithdrawalClearanceMetadata,
} from "../lib/metadataClient";
import type { Fetched, PaymentRequestAccount } from "../lib/program";
import type { PackageRollup, ProjectRollup } from "./projectSelectors";

export interface DashboardPackageSource {
  rollup: PackageRollup;
  requests: Fetched<PaymentRequestAccount>[];
  documentRequests: DocumentRequestMetadata[];
  withdrawalClearances: WithdrawalClearanceMetadata[];
}

export interface DashboardProjectSource {
  rollup: ProjectRollup;
  packages: DashboardPackageSource[];
}

export interface DashboardSummary {
  projectCount: number;
  packageCount: number;
  totalProjectBudget: bigint;
  totalAllocatedPackageBudget: bigint;
  totalRemainingAllocatableBudget: bigint;
  totalCap: bigint;
  totalFunded: bigint;
  totalRequested: bigint;
  totalApproved: bigint;
  totalReleased: bigint;
  contractorWithdrawalBalance: bigint;
  totalOutstandingFunded: bigint;
  heldAmount: bigint;
  activeRequestCount: number;
  heldRequestCount: number;
  evidenceAwaitingReviewCount: number;
  documentRequestsOutstandingCount: number;
}

const sumBig = (xs: bigint[]): bigint => xs.reduce((a, b) => a + b, 0n);

export const isWithdrawalCleared = (
  request: Fetched<PaymentRequestAccount>,
  clearances: WithdrawalClearanceMetadata[],
): boolean =>
  clearances.some(
    (clearance) =>
      clearance.paymentRequest === request.address.toBase58() &&
      clearance.amount >= request.account.releasedAmount,
  );

export const selectDashboardSummary = (
  projects: DashboardProjectSource[],
): DashboardSummary => {
  const packages = projects.flatMap((project) => project.packages);
  const requests = packages.flatMap((pkg) =>
    pkg.requests.map((request) => ({
      request,
      packageSource: pkg,
    })),
  );
  const activeRequests = requests.filter(
    ({ request }) =>
      request.account.status !== "released" &&
      request.account.status !== "rejected",
  );
  const approvedRequests = activeRequests.filter(
    ({ request }) =>
      request.account.status === "lowApproved" ||
      request.account.status === "highApproved",
  );
  const releasedRequests = requests.filter(
    ({ request }) => request.account.status === "released",
  );

  return {
    projectCount: projects.length,
    packageCount: packages.length,
    totalProjectBudget: sumBig(projects.map((p) => p.rollup.projectBudget)),
    totalAllocatedPackageBudget: sumBig(
      projects.map((p) => p.rollup.allocatedPackageBudget),
    ),
    totalRemainingAllocatableBudget: sumBig(
      projects.map((p) => p.rollup.remainingAllocatableBudget),
    ),
    totalCap: sumBig(projects.map((p) => p.rollup.totalCap)),
    totalFunded: sumBig(projects.map((p) => p.rollup.totalFunded)),
    totalRequested: sumBig(
      activeRequests.map(({ request }) => request.account.amount),
    ),
    totalApproved: sumBig(
      approvedRequests.map(({ request }) => request.account.amount),
    ),
    totalReleased: sumBig(projects.map((p) => p.rollup.totalReleased)),
    contractorWithdrawalBalance: sumBig(
      releasedRequests
        .filter(
          ({ request, packageSource }) =>
            !isWithdrawalCleared(request, packageSource.withdrawalClearances),
        )
        .map(({ request }) => request.account.releasedAmount),
    ),
    totalOutstandingFunded: sumBig(
      projects.map((p) => p.rollup.totalOutstandingFunded),
    ),
    heldAmount: sumBig(
      activeRequests
        .filter(({ request }) => request.account.holdActive)
        .map(({ request }) => request.account.amount),
    ),
    activeRequestCount: activeRequests.length,
    heldRequestCount: activeRequests.filter(
      ({ request }) => request.account.holdActive,
    ).length,
    evidenceAwaitingReviewCount: activeRequests.filter(
      ({ request }) => request.account.status === "submitted",
    ).length,
    documentRequestsOutstandingCount: packages.reduce(
      (count, pkg) =>
        count +
        pkg.documentRequests.filter((request) => request.status === "requested")
          .length,
      0,
    ),
  };
};
