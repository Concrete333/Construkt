import { useEffect, useState } from "react";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
import { formatTimestamp, shortAddress } from "../lib/format";
import { DEMO_ROLE_LABEL } from "../lib/theme";
import { collapseSeededReviewProjects } from "../lib/clients";
import {
  filterProjectsByContractor,
  selectPackageRollup,
  selectProjectRollup,
} from "../selectors/projectSelectors";
import { isWithdrawalCleared } from "../selectors/dashboardSelectors";
import { selectAuditTimeline } from "../selectors/auditSelectors";
import {
  isPaymentRequestActive,
  paymentRequestChipTone,
  paymentRequestDisplayStatus,
  paymentRequestStatusLabel,
} from "../selectors/paymentSelectors";
import type {
  PackageRollup,
  ProjectRollup,
} from "../selectors/projectSelectors";
import type { DashboardPackageSource } from "../selectors/dashboardSelectors";
import type { AuditEvent, AuditEventKind } from "../selectors/auditSelectors";
import type { PaymentRequestDisplayStatus } from "../selectors/paymentSelectors";
import type {
  ApprovalRecord,
  Fetched,
  PaymentRequestAccount,
  RoleAssignmentAccount,
  WorkPackageAccount,
} from "../lib/program";
import type { DemoRole } from "../lib/theme";
import "./Dashboard2Page.css";

interface ProjectBundle {
  rollup: ProjectRollup;
  packages: PackageRollup[];
  packageSources: DashboardPackageSource[];
  packageNames: Map<PublicKeyB58, string>;
  activeRequests: Array<{
    workPackage: PublicKeyB58;
    workPackageName: string;
    request: PaymentRequestAccount;
    address: PublicKeyB58;
  }>;
}

type PublicKeyB58 = string;

interface OutstandingTask {
  key: string;
  title: string;
  meta: string;
  href: string;
  amount: bigint | null;
  tone: "info" | "warning" | "success" | "error" | "neutral";
}

interface LoadedDashboard {
  bundles: ProjectBundle[];
  recentActivity: EnrichedAuditEvent[];
  outstanding: OutstandingTask[];
}

interface EnrichedAuditEvent extends AuditEvent {
  projectName: string;
}

interface Dashboard2PageProps {
  role: DemoRole;
}

const RECENT_ACTIVITY_LIMIT = 8;

export const Dashboard2Page = ({ role }: Dashboard2PageProps) => {
  const { client, metadata, world } = useClients();
  const [loaded, setLoaded] = useState<LoadedDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const allProjects = await client.fetchProjects();
      const displayProjects = collapseSeededReviewProjects(
        allProjects,
        world.project,
      );
      const packagesByProject = new Map<
        string,
        Fetched<WorkPackageAccount>[]
      >();

      const packageEntries = await Promise.all(
        displayProjects.map(async (project) => ({
          project,
          packages: await client.fetchWorkPackagesForProject(project.address),
        })),
      );
      for (const { project, packages } of packageEntries) {
        packagesByProject.set(project.address.toBase58(), packages);
      }

      const visibleProjects =
        role === "contractor"
          ? filterProjectsByContractor(
              displayProjects,
              packagesByProject,
              world.contractor.publicKey,
            )
          : displayProjects;

      const projectResults = await Promise.all(
        visibleProjects.map(async (project) => {
          const packages =
            packagesByProject.get(project.address.toBase58()) ?? [];

          const rollups: PackageRollup[] = [];
          const packageSources: DashboardPackageSource[] = [];
          const packageNames = new Map<PublicKeyB58, string>();
          const activeRequests: ProjectBundle["activeRequests"] = [];
          const allRoleAssignments: Fetched<RoleAssignmentAccount>[] = [];
          const allRequests: Fetched<PaymentRequestAccount>[] = [];
          const allApprovals: Fetched<ApprovalRecord>[] = [];

          await Promise.all(
            packages.map(async (pkg) => {
              const [
                roleAssignments,
                requests,
                documentRequests,
                withdrawalClearances,
                scope,
              ] = await Promise.all([
                client.fetchRoleAssignmentsForPackage(pkg.address),
                client.fetchPaymentRequestsForPackage(pkg.address),
                metadata.listDocumentRequestsForPackage(pkg.address.toBase58()),
                metadata.listWithdrawalClearancesForPackage(
                  pkg.address.toBase58(),
                ),
                metadata.resolvePackageScope(pkg.account.scopeRef),
              ]);
              allRoleAssignments.push(...roleAssignments);
              allRequests.push(...requests);
              const packageName =
                scope?.description?.split(".")[0] ??
                `Package #${pkg.account.packageId.toString()}`;
              packageNames.set(pkg.address.toBase58(), packageName);

              const approvals = await Promise.all(
                requests.map((request) =>
                  client.fetchApprovalsForRequest(request.address),
                ),
              );
              allApprovals.push(...approvals.flat());

              const activeFetchedRequests = [...requests]
                .filter((request) => isPaymentRequestActive(request.account))
                .sort((a, b) =>
                  a.account.requestId < b.account.requestId ? 1 : -1,
                );
              const activeFetchedRequest =
                activeFetchedRequests.find(
                  (request) => request.account.holdActive,
                ) ??
                (pkg.account.hasActiveRequest
                  ? (requests.find((request) =>
                      request.address.equals(pkg.account.activeRequest),
                    ) ?? null)
                  : (activeFetchedRequests[0] ?? null));

              const packageRollup = selectPackageRollup(
                pkg,
                activeFetchedRequest?.account ?? null,
                activeFetchedRequest?.address ?? null,
              );
              rollups.push(packageRollup);
              packageSources.push({
                rollup: packageRollup,
                requests,
                documentRequests: documentRequests.map(([, data]) => data),
                withdrawalClearances: withdrawalClearances.map(
                  ([, data]) => data,
                ),
              });

              if (activeFetchedRequests.length > 0) {
                for (const request of activeFetchedRequests) {
                  activeRequests.push({
                    workPackage: pkg.address.toBase58(),
                    workPackageName: packageName,
                    request: request.account,
                    address: request.address.toBase58(),
                  });
                }
              }
            }),
          );

          const rollup = selectProjectRollup(project, rollups);
          const bundle = {
            rollup,
            packages: rollups,
            packageSources,
            packageNames,
            activeRequests,
          };

          const baseTimeline = selectAuditTimeline({
            project,
            roleAssignments: allRoleAssignments,
            paymentRequests: allRequests,
            approvals: allApprovals,
          });
          const events = baseTimeline.map((event) => ({
            ...event,
            projectName: project.account.name,
          }));
          return { bundle, events };
        }),
      );

      const bundles = projectResults.map((result) => result.bundle);
      const allEvents = projectResults.flatMap((result) => result.events);

      allEvents.sort((a, b) => {
        if (a.at < b.at) return 1;
        if (a.at > b.at) return -1;
        return 0;
      });

      if (!cancelled) {
        setLoaded({
          bundles,
          recentActivity: allEvents.slice(0, RECENT_ACTIVITY_LIMIT),
          outstanding: buildOutstandingTasks(role, bundles),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, metadata, world, role]);

  if (loaded === null) {
    return <div className="dashboard2__loading">Loading dashboard...</div>;
  }

  return (
    <section className="dashboard2">
      <div className="dashboard2__viewport">
        <div className="dashboard2__content">
          <main className="dashboard2__main-section">
            <h1 className="dashboard2__title">{DEMO_ROLE_LABEL[role]}</h1>
            {role === "contractor" && (
              <ContractorWithdrawalSummary bundles={loaded.bundles} />
            )}
            <ProjectFundingOverview bundles={loaded.bundles} role={role} />
          </main>
          <aside className="dashboard2__sidebar">
            <OutstandingTasks tasks={loaded.outstanding} />
          </aside>
        </div>
      </div>

      <RecentActivity events={loaded.recentActivity} />
    </section>
  );
};

interface ContractorWithdrawalRow {
  key: string;
  projectName: string;
  packageName: string;
  href: string;
  amount: bigint;
}

const ContractorWithdrawalSummary = ({
  bundles,
}: {
  bundles: ProjectBundle[];
}) => {
  const rows: ContractorWithdrawalRow[] = [];
  for (const bundle of bundles) {
    for (const source of bundle.packageSources) {
      const amount = source.requests
        .filter(
          (request) =>
            request.account.status === "released" &&
            request.account.releasedAmount > 0n &&
            !isWithdrawalCleared(request, source.withdrawalClearances),
        )
        .reduce((sum, request) => sum + request.account.releasedAmount, 0n);
      if (amount <= 0n) continue;
      rows.push({
        key: source.rollup.address.toBase58(),
        projectName: bundle.rollup.project.name,
        packageName: packageLabel(source.rollup, bundle.packageNames),
        href: buildHash("workPackageView", {
          address: source.rollup.address.toBase58(),
        }),
        amount,
      });
    }
  }

  const total = rows.reduce((sum, row) => sum + row.amount, 0n);

  return (
    <section className="dashboard2__withdrawal-summary">
      <div>
        <span className="dashboard2__withdrawal-label">
          Available for withdrawal
        </span>
        <strong className="dashboard2__withdrawal-total">
          <Money amount={total} withSymbol />
        </strong>
        <p className="dashboard2__withdrawal-note">
          Released funds not yet marked as withdrawn.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="dashboard2__withdrawal-empty">
          No released package funds are waiting to be withdrawn.
        </p>
      ) : (
        <ul className="dashboard2__withdrawal-list">
          {rows.slice(0, 4).map((row) => (
            <li key={row.key}>
              <a className="dashboard2__withdrawal-row" href={row.href}>
                <span>
                  {row.projectName} - {row.packageName}
                </span>
                <strong>
                  <Money amount={row.amount} withSymbol />
                </strong>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const ProjectFundingOverview = ({
  bundles,
  role,
}: {
  bundles: ProjectBundle[];
  role: DemoRole;
}) => {
  const title =
    role === "contractor"
      ? "Assigned Work Packages"
      : "Project Funding Overview";
  const empty =
    role === "contractor"
      ? "No assigned packages yet."
      : "No active projects yet.";

  return (
    <section className="dashboard2__chart-card">
      <div className="dashboard2__chart-header">
        <h2>{title}</h2>
      </div>
      <div
        className="dashboard2__legend"
        aria-label="Project funding status legend"
      >
        <LegendItem tone="completed" label="Completed" />
        <LegendItem tone="progress" label="In Progress" />
        <LegendItem tone="estimated" label="Estimated" />
        <LegendItem tone="unallocated" label="Unallocated" />
      </div>
      <div className="dashboard2__chart-content">
        {bundles.length === 0 ? (
          <div className="dashboard2__chart-empty">{empty}</div>
        ) : (
          bundles
            .slice(0, 7)
            .map((bundle) => (
              <FundingRow
                key={bundle.rollup.address.toBase58()}
                bundle={bundle}
              />
            ))
        )}
      </div>
    </section>
  );
};

const LegendItem = ({
  tone,
  label,
}: {
  tone: "completed" | "progress" | "estimated" | "unallocated";
  label: string;
}) => (
  <span>
    <i className={`dashboard2__legend-dot dashboard2__legend-dot--${tone}`} />
    {label}
  </span>
);

const FundingRow = ({ bundle }: { bundle: ProjectBundle }) => {
  const rollup = bundle.rollup;
  const href = buildHash("projectDetail", {
    address: rollup.address.toBase58(),
  });
  const total = rollup.projectBudget > 0n ? rollup.projectBudget : 1n;
  const segments = buildFundingSegments(bundle);

  return (
    <div className="dashboard2__chart-row">
      <a className="dashboard2__chart-label" href={href}>
        {rollup.project.name}
      </a>
      <div className="dashboard2__chart-bar">
        {segments.map((segment) => (
          <a
            key={segment.key}
            className={`dashboard2__chart-segment dashboard2__chart-segment--${segment.tone}`}
            href={segment.href ?? href}
            title={segment.tooltip}
            aria-label={segment.tooltip}
            style={{
              width: `${Math.max(Number((segment.amount * 10000n) / total) / 100, 2)}%`,
            }}
          />
        ))}
      </div>
      <div className="dashboard2__chart-value">{projectDueLabel(bundle)}</div>
    </div>
  );
};

interface FundingSegment {
  key: string;
  amount: bigint;
  tone: "completed" | "progress" | "estimated" | "unallocated";
  tooltip: string;
  href?: string;
}

const buildFundingSegments = (bundle: ProjectBundle): FundingSegment[] => {
  const segments: FundingSegment[] = [];
  for (const pkg of bundle.packages) {
    const packageHref = buildHash("workPackageView", {
      address: pkg.address.toBase58(),
    });

    if (pkg.package.releasedAmount > 0n) {
      segments.push({
        key: `${pkg.address.toBase58()}-released`,
        amount: pkg.package.releasedAmount,
        tone: "completed",
        tooltip: `${packageLabel(pkg, bundle.packageNames)} - released`,
        href: packageHref,
      });
    }

    const inProgress = pkg.package.fundedAmount - pkg.package.releasedAmount;
    if (inProgress > 0n) {
      segments.push({
        key: `${pkg.address.toBase58()}-progress`,
        amount: inProgress,
        tone: "progress",
        tooltip: `${packageLabel(pkg, bundle.packageNames)} - in progress`,
        href: packageHref,
      });
    }

    const estimated =
      pkg.package.capAmount > pkg.package.fundedAmount
        ? pkg.package.capAmount - pkg.package.fundedAmount
        : 0n;
    if (estimated > 0n) {
      segments.push({
        key: `${pkg.address.toBase58()}-estimated`,
        amount: estimated,
        tone: "estimated",
        tooltip: `${packageLabel(pkg, bundle.packageNames)} - estimated`,
        href: packageHref,
      });
    }
  }

  if (bundle.rollup.remainingAllocatableBudget > 0n) {
    segments.push({
      key: `${bundle.rollup.address.toBase58()}-unallocated`,
      amount: bundle.rollup.remainingAllocatableBudget,
      tone: "unallocated",
      tooltip: "Unallocated budget",
    });
  }

  return segments.length > 0
    ? segments
    : [
        {
          key: `${bundle.rollup.address.toBase58()}-empty`,
          amount: 1n,
          tone: "unallocated",
          tooltip: "No allocated package budget yet",
        },
      ];
};

const packageLabel = (
  pkg: PackageRollup,
  names: Map<PublicKeyB58, string>,
): string =>
  names.get(pkg.address.toBase58()) ??
  `Package #${pkg.package.packageId.toString()}`;

const projectDueLabel = (bundle: ProjectBundle): string => {
  if (bundle.rollup.project.status === "completed") return "Completed";
  if (bundle.rollup.heldPackageCount > 0) return "Held";
  if (bundle.rollup.packagesWithActiveRequest > 0) return "In review";
  if (bundle.rollup.draftPackageCount > 0) return "Estimated";
  return bundle.rollup.activePackageCount > 0 ? "In Progress" : "No packages";
};

const OutstandingTasks = ({ tasks }: { tasks: OutstandingTask[] }) => (
  <section className="dashboard2__tasks-card">
    <div className="dashboard2__panel-head">
      <h2>Outstanding Tasks</h2>
      <span className="dashboard2__panel-eyebrow">
        {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
      </span>
    </div>
    {tasks.length === 0 ? (
      <p className="dashboard2__empty">Nothing waiting on you right now.</p>
    ) : (
      <ul className="dashboard2__tasks">
        {tasks.map((task) => (
          <li key={task.key} className="dashboard2__task">
            <a className="dashboard2__task-link" href={task.href}>
              <div className="dashboard2__task-body">
                <p className="dashboard2__task-title">{task.title}</p>
                <p className="dashboard2__task-meta">{task.meta}</p>
              </div>
              <div className="dashboard2__task-side">
                <StatusPill tone={task.tone}>Open</StatusPill>
                {task.amount !== null && (
                  <span className="dashboard2__task-amount">
                    <Money amount={task.amount} withSymbol />
                  </span>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const RecentActivity = ({ events }: { events: EnrichedAuditEvent[] }) => (
  <section className="dashboard2__recent-activity">
    <div className="dashboard2__recent-head">
      <svg
        className="dashboard2__recent-arrow"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M19 9l-7 7-7-7" />
      </svg>
      <h2>Recent Activity</h2>
    </div>
    {events.length === 0 ? (
      <p className="dashboard2__empty">No activity yet.</p>
    ) : (
      <ol className="dashboard2__activity">
        {events.map((event, idx) => (
          <li
            key={`${event.kind}-${event.at}-${idx}`}
            className="dashboard2__event"
          >
            <span
              className={`dashboard2__dot dashboard2__dot--${dotTone(
                event.kind,
              )}`}
              aria-hidden="true"
            />
            <div className="dashboard2__event-body">
              <p className="dashboard2__event-title">{event.label}</p>
              <p className="dashboard2__event-meta">
                {event.projectName} - {formatTimestamp(event.at)}
                {event.actor && (
                  <>
                    {" "}
                    -{" "}
                    <span className="dashboard2__event-wallet">
                      {shortAddress(event.actor.toBase58())}
                    </span>
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    )}
  </section>
);

const dotTone = (
  kind: AuditEventKind,
): "info" | "success" | "warning" | "error" | "neutral" => {
  switch (kind) {
    case "requestReleased":
    case "requestLowApproved":
    case "requestHighApproved":
      return "success";
    case "requestRejected":
      return "error";
    case "holdActive":
      return "warning";
    case "requestSubmitted":
      return "info";
    case "projectCreated":
    case "roleAssigned":
    default:
      return "neutral";
  }
};

const buildOutstandingTasks = (
  role: DemoRole,
  bundles: ProjectBundle[],
): OutstandingTask[] => {
  const tasks: OutstandingTask[] = [];
  for (const bundle of bundles) {
    for (const entry of bundle.activeRequests) {
      const status: PaymentRequestDisplayStatus = paymentRequestDisplayStatus(
        entry.request,
      );
      const matches = roleMatchesActiveRequest(role, status);
      if (!matches) continue;
      tasks.push({
        key: `${entry.address}-${role}`,
        title: `${matches.action}: ${entry.workPackageName}`,
        meta: `${bundle.rollup.project.name} - ${paymentRequestStatusLabel(
          status,
        )}`,
        href: buildHash("workPackageView", {
          address: entry.workPackage,
        }),
        amount: entry.request.amount,
        tone: paymentRequestChipTone(status),
      });
    }

    if (role === "contractor") {
      for (const source of bundle.packageSources) {
        const available = source.requests
          .filter(
            (request) =>
              request.account.status === "released" &&
              request.account.releasedAmount > 0n &&
              !isWithdrawalCleared(request, source.withdrawalClearances),
          )
          .reduce((sum, request) => sum + request.account.releasedAmount, 0n);
        if (available > 0n) {
          tasks.push({
            key: `withdraw-${source.rollup.address.toBase58()}`,
            title: `Withdraw funds: ${packageLabel(
              source.rollup,
              bundle.packageNames,
            )}`,
            meta: `${bundle.rollup.project.name} - released, not yet cleared`,
            href: buildHash("workPackageView", {
              address: source.rollup.address.toBase58(),
            }),
            amount: available,
            tone: "success",
          });
        }
      }

      for (const pkg of bundle.packages) {
        if (
          pkg.hasActiveRequest ||
          pkg.package.status !== "active" ||
          pkg.package.fundedAmount === pkg.package.releasedAmount
        ) {
          continue;
        }
        tasks.push({
          key: `submit-${pkg.address.toBase58()}`,
          title: `Submit invoice: ${packageLabel(pkg, bundle.packageNames)}`,
          meta: `${bundle.rollup.project.name} - funded, no active request`,
          href: buildHash("workPackageView", {
            address: pkg.address.toBase58(),
          }),
          amount: pkg.outstandingFunded,
          tone: "info",
        });
      }
    }
  }
  return tasks;
};

const roleMatchesActiveRequest = (
  role: DemoRole,
  status: PaymentRequestDisplayStatus,
): { action: string } | null => {
  switch (role) {
    case "financeDirector":
      if (status === "lowApproved" || status === "highApproved") {
        return { action: "Release" };
      }
      if (
        status === "submittedOnHold" ||
        status === "lowApprovedOnHold" ||
        status === "highApprovedOnHold"
      ) {
        return { action: "Review hold" };
      }
      return null;
    case "projectManager":
      if (status === "submitted") return { action: "Approve as PM" };
      if (status === "submittedOnHold") return { action: "Review (held)" };
      return null;
    case "director":
      if (status === "lowApproved") return { action: "Approve high step" };
      if (status === "lowApprovedOnHold") return { action: "Review (held)" };
      return null;
    case "contractor":
      if (status === "rejected") return { action: "Resubmit" };
      if (status === "submitted") return { action: "Awaiting PM" };
      if (status === "lowApproved") return { action: "Awaiting Finance" };
      if (status === "highApproved") return { action: "Awaiting Finance" };
      return null;
  }
};
