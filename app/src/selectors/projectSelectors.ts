import type { PublicKey } from "@solana/web3.js";
import type {
  Fetched,
  PaymentRequestAccount,
  ProjectAccount,
  ProjectStatus,
  WorkPackageAccount,
  WorkPackageStatus,
} from "../lib/program";

/**
 * Per-package rollup combining cap/funded/released balances with the
 * current request state. Selectors that aggregate at the project level
 * fan out into these.
 */
export interface PackageRollup {
  address: PublicKey;
  package: WorkPackageAccount;
  /** `cap - funded`. Tracked headroom finance can still escrow into. */
  remainingCapacity: bigint;
  /** `funded - released`. Money that's locked but not yet paid out. */
  outstandingFunded: bigint;
  /** `cap - released`. Total still owed to contractor over the package's life. */
  unreleasedAgainstCap: bigint;
  hasActiveRequest: boolean;
  activeRequest: PublicKey | null;
  /** True if the active request (if any) is currently held. */
  isHeld: boolean;
}

export const selectPackageRollup = (
  fetched: Fetched<WorkPackageAccount>,
  activeRequest: PaymentRequestAccount | null,
): PackageRollup => {
  const wp = fetched.account;
  return {
    address: fetched.address,
    package: wp,
    remainingCapacity: wp.capAmount - wp.fundedAmount,
    outstandingFunded: wp.fundedAmount - wp.releasedAmount,
    unreleasedAgainstCap: wp.capAmount - wp.releasedAmount,
    hasActiveRequest: wp.hasActiveRequest,
    activeRequest: wp.hasActiveRequest ? wp.activeRequest : null,
    isHeld: activeRequest?.holdActive ?? false,
  };
};

export interface ProjectRollup {
  address: PublicKey;
  project: ProjectAccount;
  packageCount: number;
  activePackageCount: number;
  completedPackageCount: number;
  cancelledPackageCount: number;
  packagesWithActiveRequest: number;
  heldPackageCount: number;
  projectBudget: bigint;
  allocatedPackageBudget: bigint;
  remainingAllocatableBudget: bigint;
  totalCap: bigint;
  totalFunded: bigint;
  totalReleased: bigint;
  /** `totalFunded - totalReleased`. */
  totalOutstandingFunded: bigint;
  /** `totalCap - totalReleased`. */
  totalUnreleasedAgainstCap: bigint;
}

const sumBig = (xs: bigint[]): bigint => xs.reduce((a, b) => a + b, 0n);

export const selectProjectRollup = (
  fetched: Fetched<ProjectAccount>,
  packages: PackageRollup[],
): ProjectRollup => {
  const totalCap = sumBig(packages.map((p) => p.package.capAmount));
  const totalFunded = sumBig(packages.map((p) => p.package.fundedAmount));
  const totalReleased = sumBig(packages.map((p) => p.package.releasedAmount));
  const projectBudget = fetched.account.budgetAmount;
  const allocatedPackageBudget = fetched.account.allocatedAmount;
  const byStatus = (s: WorkPackageStatus) =>
    packages.filter((p) => p.package.status === s).length;
  return {
    address: fetched.address,
    project: fetched.account,
    packageCount: packages.length,
    activePackageCount: byStatus("active"),
    completedPackageCount: byStatus("completed"),
    cancelledPackageCount: byStatus("cancelled"),
    packagesWithActiveRequest: packages.filter((p) => p.hasActiveRequest)
      .length,
    heldPackageCount: packages.filter((p) => p.isHeld).length,
    projectBudget,
    allocatedPackageBudget,
    remainingAllocatableBudget: projectBudget - allocatedPackageBudget,
    totalCap,
    totalFunded,
    totalReleased,
    totalOutstandingFunded: totalFunded - totalReleased,
    totalUnreleasedAgainstCap: totalCap - totalReleased,
  };
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PACKAGE_STATUS_LABELS: Record<WorkPackageStatus, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const projectStatusLabel = (status: ProjectStatus): string =>
  PROJECT_STATUS_LABELS[status];

export const workPackageStatusLabel = (status: WorkPackageStatus): string =>
  PACKAGE_STATUS_LABELS[status];

/**
 * Filters a project list to only the projects where a contractor wallet has
 * at least one role assignment on a package. Mirrors the prototype's
 * "contractors only see assigned projects" rule for `dashboard2` and the
 * contractor Projects surface.
 */
export const filterProjectsByContractor = (
  projects: Fetched<ProjectAccount>[],
  packagesByProject: Map<string, Fetched<WorkPackageAccount>[]>,
  contractor: PublicKey,
): Fetched<ProjectAccount>[] =>
  projects.filter((p) => {
    const pkgs = packagesByProject.get(p.address.toBase58()) ?? [];
    return pkgs.some((pkg) => pkg.account.contractor.equals(contractor));
  });
