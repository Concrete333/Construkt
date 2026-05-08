import { useEffect, useState } from "react";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
import { formatTimestamp, shortAddress } from "../lib/format";
import { DEMO_ROLE_LABEL } from "../lib/theme";
import {
  filterProjectsByContractor,
  projectStatusLabel,
  selectPackageRollup,
  selectProjectRollup,
} from "../selectors/projectSelectors";
import { selectAuditTimeline } from "../selectors/auditSelectors";
import {
  paymentRequestChipTone,
  paymentRequestDisplayStatus,
  paymentRequestStatusLabel,
} from "../selectors/paymentSelectors";
import type {
  PackageRollup,
  ProjectRollup,
} from "../selectors/projectSelectors";
import type { AuditEvent, AuditEventKind } from "../selectors/auditSelectors";
import type { PaymentRequestDisplayStatus } from "../selectors/paymentSelectors";
import type {
  ApprovalRecord,
  Fetched,
  PaymentRequestAccount,
  RoleAssignmentAccount,
  WorkPackageAccount,
} from "../lib/program";
import type { ProjectMetadata } from "../lib/metadataClient";
import type { DemoRole } from "../lib/theme";
import "./Dashboard2Page.css";

interface ProjectBundle {
  rollup: ProjectRollup;
  metadata: ProjectMetadata | null;
  packages: PackageRollup[];
  /** Active payment requests for the project's packages (one per package max). */
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

interface CrossProjectKpis {
  projectCount: number;
  packageCount: number;
  totalCap: bigint;
  totalFunded: bigint;
  totalReleased: bigint;
  totalOutstandingFunded: bigint;
  activeRequestCount: number;
  heldRequestCount: number;
}

interface LoadedDashboard {
  bundles: ProjectBundle[];
  kpis: CrossProjectKpis;
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

      const packagesByProject = new Map<
        string,
        Fetched<WorkPackageAccount>[]
      >();
      for (const project of allProjects) {
        const packages = await client.fetchWorkPackagesForProject(
          project.address,
        );
        packagesByProject.set(project.address.toBase58(), packages);
      }

      const visibleProjects =
        role === "contractor"
          ? filterProjectsByContractor(
              allProjects,
              packagesByProject,
              world.contractor.publicKey,
            )
          : allProjects;

      const bundles: ProjectBundle[] = [];
      const allEvents: EnrichedAuditEvent[] = [];

      for (const project of visibleProjects) {
        const projectMeta = await metadata.resolveProject(
          project.account.metadataRef,
        );
        const packages =
          packagesByProject.get(project.address.toBase58()) ?? [];

        const rollups: PackageRollup[] = [];
        const activeRequests: ProjectBundle["activeRequests"] = [];
        const allRoleAssignments: Fetched<RoleAssignmentAccount>[] = [];
        const allRequests: Fetched<PaymentRequestAccount>[] = [];
        const allApprovals: Fetched<ApprovalRecord>[] = [];

        for (const pkg of packages) {
          const ras = await client.fetchRoleAssignmentsForPackage(pkg.address);
          allRoleAssignments.push(...ras);

          const reqs = await client.fetchPaymentRequestsForPackage(pkg.address);
          allRequests.push(...reqs);

          for (const r of reqs) {
            const approvals = await client.fetchApprovalsForRequest(r.address);
            allApprovals.push(...approvals);
          }

          const activeRequest = pkg.account.hasActiveRequest
            ? await client.fetchPaymentRequest(pkg.account.activeRequest)
            : null;
          rollups.push(selectPackageRollup(pkg, activeRequest));
          if (activeRequest) {
            const scope = await metadata.resolvePackageScope(
              pkg.account.scopeRef,
            );
            activeRequests.push({
              workPackage: pkg.address.toBase58(),
              workPackageName:
                scope?.description?.split(".")[0] ??
                `Package #${pkg.account.packageId.toString()}`,
              request: activeRequest,
              address: pkg.account.activeRequest.toBase58(),
            });
          }
        }

        const rollup = selectProjectRollup(project, rollups);
        bundles.push({
          rollup,
          metadata: projectMeta,
          packages: rollups,
          activeRequests,
        });

        const baseTimeline = selectAuditTimeline({
          project,
          roleAssignments: allRoleAssignments,
          paymentRequests: allRequests,
          approvals: allApprovals,
        });
        for (const event of baseTimeline) {
          allEvents.push({ ...event, projectName: project.account.name });
        }
      }

      // Recent activity: newest first, capped.
      allEvents.sort((a, b) => {
        if (a.at < b.at) return 1;
        if (a.at > b.at) return -1;
        return 0;
      });
      const recentActivity = allEvents.slice(0, RECENT_ACTIVITY_LIMIT);

      const kpis = aggregateKpis(bundles);
      const outstanding = buildOutstandingTasks(role, bundles);

      if (!cancelled) {
        setLoaded({ bundles, kpis, recentActivity, outstanding });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, metadata, world, role]);

  if (loaded === null) {
    return <div className="dashboard2__loading">Loading dashboard…</div>;
  }

  const { bundles, kpis, recentActivity, outstanding } = loaded;

  return (
    <section className="dashboard2">
      <header className="dashboard2__head">
        <p className="dashboard2__eyebrow">Welcome back</p>
        <h1>{DEMO_ROLE_LABEL[role]}</h1>
        <p className="dashboard2__lead">{roleLead(role)}</p>
      </header>

      <KpiStrip kpis={kpis} />

      <div className="dashboard2__columns">
        <main className="dashboard2__main">
          <section className="dashboard2__panel">
            <div className="dashboard2__panel-head">
              <h2>Outstanding tasks</h2>
              <span className="dashboard2__panel-eyebrow">
                {outstanding.length}{" "}
                {outstanding.length === 1 ? "task" : "tasks"}
              </span>
            </div>
            {outstanding.length === 0 ? (
              <p className="dashboard2__empty">
                Nothing waiting on you right now.
              </p>
            ) : (
              <ul className="dashboard2__tasks">
                {outstanding.map((task) => (
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

          <section className="dashboard2__panel">
            <div className="dashboard2__panel-head">
              <h2>Projects</h2>
              <span className="dashboard2__panel-eyebrow">
                {bundles.length} {bundles.length === 1 ? "project" : "projects"}
              </span>
            </div>
            {bundles.length === 0 ? (
              <p className="dashboard2__empty">
                {role === "contractor"
                  ? "No projects with assigned packages yet."
                  : "No projects yet."}
              </p>
            ) : (
              <ul className="dashboard2__projects">
                {bundles.map((bundle) => (
                  <ProjectQuickCard
                    key={bundle.rollup.address.toBase58()}
                    bundle={bundle}
                  />
                ))}
              </ul>
            )}
          </section>
        </main>

        <aside className="dashboard2__aside">
          <section className="dashboard2__panel">
            <div className="dashboard2__panel-head">
              <h2>Recent activity</h2>
              <span className="dashboard2__panel-eyebrow">
                Newest first · top {RECENT_ACTIVITY_LIMIT}
              </span>
            </div>
            {recentActivity.length === 0 ? (
              <p className="dashboard2__empty">No activity yet.</p>
            ) : (
              <ol className="dashboard2__activity">
                {recentActivity.map((event, idx) => (
                  <li
                    key={`${event.kind}-${event.at}-${idx}`}
                    className="dashboard2__event"
                  >
                    <span
                      className={`dashboard2__dot dashboard2__dot--${dotTone(event.kind)}`}
                      aria-hidden="true"
                    />
                    <div className="dashboard2__event-body">
                      <p className="dashboard2__event-title">{event.label}</p>
                      <p className="dashboard2__event-meta">
                        {event.projectName} · {formatTimestamp(event.at)}
                        {event.actor && (
                          <>
                            {" "}
                            ·{" "}
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
        </aside>
      </div>
    </section>
  );
};

const aggregateKpis = (bundles: ProjectBundle[]): CrossProjectKpis => {
  const sumBig = (xs: bigint[]): bigint => xs.reduce((a, b) => a + b, 0n);
  return {
    projectCount: bundles.length,
    packageCount: bundles.reduce((a, b) => a + b.rollup.packageCount, 0),
    totalCap: sumBig(bundles.map((b) => b.rollup.totalCap)),
    totalFunded: sumBig(bundles.map((b) => b.rollup.totalFunded)),
    totalReleased: sumBig(bundles.map((b) => b.rollup.totalReleased)),
    totalOutstandingFunded: sumBig(
      bundles.map((b) => b.rollup.totalOutstandingFunded),
    ),
    activeRequestCount: bundles.reduce(
      (a, b) => a + b.rollup.packagesWithActiveRequest,
      0,
    ),
    heldRequestCount: bundles.reduce(
      (a, b) => a + b.rollup.heldPackageCount,
      0,
    ),
  };
};

const KpiStrip = ({ kpis }: { kpis: CrossProjectKpis }) => (
  <dl className="dashboard2__kpis">
    <KpiTile label="Projects" value={kpis.projectCount.toString()} />
    <KpiTile label="Packages" value={kpis.packageCount.toString()} />
    <KpiTile label="Total cap">
      <Money amount={kpis.totalCap} withSymbol />
    </KpiTile>
    <KpiTile label="Funded">
      <Money amount={kpis.totalFunded} withSymbol />
    </KpiTile>
    <KpiTile label="Released">
      <Money amount={kpis.totalReleased} withSymbol />
    </KpiTile>
    <KpiTile label="Outstanding">
      <Money amount={kpis.totalOutstandingFunded} withSymbol />
    </KpiTile>
    <KpiTile
      label="Active requests"
      value={kpis.activeRequestCount.toString()}
    />
    <KpiTile label="Holds" value={kpis.heldRequestCount.toString()} />
  </dl>
);

const KpiTile = ({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) => (
  <div className="dashboard2__kpi">
    <dt>{label}</dt>
    <dd>{children ?? value}</dd>
  </div>
);

const ProjectQuickCard = ({ bundle }: { bundle: ProjectBundle }) => {
  const detailHref = buildHash("projectDetail", {
    address: bundle.rollup.address.toBase58(),
  });
  const { rollup, metadata } = bundle;
  return (
    <li className="dashboard2__project">
      <a className="dashboard2__project-link" href={detailHref}>
        <div className="dashboard2__project-head">
          <h3>{rollup.project.name}</h3>
          <StatusPill
            tone={rollup.project.status === "completed" ? "success" : "info"}
          >
            {projectStatusLabel(rollup.project.status)}
          </StatusPill>
        </div>
        {metadata && (
          <p className="dashboard2__project-client">
            Client · <strong>{metadata.client}</strong>
          </p>
        )}
        <dl className="dashboard2__project-metrics">
          <KpiTile label="Packages" value={rollup.packageCount.toString()} />
          <KpiTile label="Released">
            <Money amount={rollup.totalReleased} withSymbol />
          </KpiTile>
          <KpiTile label="Outstanding">
            <Money amount={rollup.totalOutstandingFunded} withSymbol />
          </KpiTile>
        </dl>
        {rollup.heldPackageCount > 0 && (
          <p className="dashboard2__project-flags">
            <StatusPill tone="warning">
              {rollup.heldPackageCount} on hold
            </StatusPill>
          </p>
        )}
      </a>
    </li>
  );
};

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

const roleLead = (role: DemoRole): string => {
  switch (role) {
    case "financeDirector":
      return "Cross-project funding, holds, and release readiness for every active package.";
    case "projectManager":
      return "Packages on your projects waiting for PM approval, plus team and document activity.";
    case "director":
      return "Payment requests waiting on Director (HighApprover) sign-off.";
    case "contractor":
      return "Your assigned projects and packages, with submission and release status.";
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
        meta: `${bundle.rollup.project.name} · ${paymentRequestStatusLabel(status)}`,
        href: buildHash("workPackageView", {
          address: entry.workPackage,
        }),
        amount: entry.request.amount,
        tone: paymentRequestChipTone(status),
      });
    }
    if (role === "contractor") {
      // Surface packages with no active request as a prompt to submit one.
      for (const pkg of bundle.packages) {
        if (
          pkg.hasActiveRequest ||
          pkg.package.status !== "active" ||
          pkg.package.fundedAmount === pkg.package.releasedAmount
        )
          continue;
        if (!pkg.package.contractor) continue;
        tasks.push({
          key: `submit-${pkg.address.toBase58()}`,
          title: `Submit invoice: package #${pkg.package.packageId.toString()}`,
          meta: `${bundle.rollup.project.name} · funded, no active request`,
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
      // Finance acts on requests ready for release, requests on hold, and
      // requests stuck in any pre-release state (so they can place / remove
      // a hold or escalate).
      if (status === "lowApproved" || status === "highApproved")
        return { action: "Release" };
      if (
        status === "submittedOnHold" ||
        status === "lowApprovedOnHold" ||
        status === "highApprovedOnHold"
      )
        return { action: "Review hold" };
      return null;
    case "projectManager":
      if (status === "submitted") return { action: "Approve as PM" };
      if (status === "submittedOnHold") return { action: "Review (held)" };
      return null;
    case "director":
      if (status === "lowApproved") return { action: "Approve as Director" };
      if (status === "lowApprovedOnHold") return { action: "Review (held)" };
      return null;
    case "contractor":
      if (status === "rejected") return { action: "Resubmit" };
      // The contractor's own submitted invoices stay in the list as a
      // status reminder until released.
      if (status === "submitted") return { action: "Awaiting PM" };
      if (status === "lowApproved") return { action: "Awaiting Finance" };
      if (status === "highApproved") return { action: "Awaiting Finance" };
      return null;
  }
};
