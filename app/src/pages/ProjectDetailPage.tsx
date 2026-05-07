import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
import { formatTimestamp, shortAddress } from "../lib/format";
import { teamRoleLabel } from "../lib/metadataClient";
import {
  projectStatusLabel,
  selectPackageRollup,
  selectProjectRollup,
  workPackageStatusLabel,
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
import type { AuditEvent } from "../selectors/auditSelectors";
import type {
  ApprovalRecord,
  Fetched,
  PaymentRequestAccount,
  ProjectAccount,
  RoleAssignmentAccount,
  WorkPackageAccount,
} from "../lib/program";
import type {
  ProjectMetadata,
  PackageScopeMetadata,
} from "../lib/metadataClient";
import "./ProjectDetailPage.css";

interface PackageRow {
  rollup: PackageRollup;
  scope: PackageScopeMetadata | null;
  activeRequest: PaymentRequestAccount | null;
}

interface EnrichedAuditEvent extends AuditEvent {
  actorDisplayName: string | null;
  detail: string | null;
}

interface LoadedDetail {
  rollup: ProjectRollup;
  metadata: ProjectMetadata | null;
  packages: PackageRow[];
  timeline: EnrichedAuditEvent[];
}

interface ProjectDetailPageProps {
  /** base58 address from `?address=` query param. */
  address?: string;
}

const tryDecode = (address?: string): PublicKey | null => {
  if (!address) return null;
  try {
    return new PublicKey(address);
  } catch {
    return null;
  }
};

export const ProjectDetailPage = ({ address }: ProjectDetailPageProps) => {
  const { client, metadata } = useClients();
  const projectKey = useMemo(() => tryDecode(address), [address]);
  const [loaded, setLoaded] = useState<LoadedDetail | null | "missing">(null);

  useEffect(() => {
    if (!projectKey) return;
    let cancelled = false;
    // Note: we don't synchronously reset `loaded` to `null` on address change
    // (the lint rule react-hooks/set-state-in-effect rejects sync setState in
    // effects). For the in-memory mock the fetch is instant so the brief
    // stale-state window is invisible. If Phase 4's Anchor fetches show
    // perceptible flicker, swap to a `key`-on-address remount instead.
    void (async () => {
      const projectFetched = await client.fetchProject(projectKey);
      if (!projectFetched) {
        if (!cancelled) setLoaded("missing");
        return;
      }
      const wrappedProject: Fetched<ProjectAccount> = {
        address: projectKey,
        account: projectFetched,
      };
      const projectMetadata = await metadata.resolveProject(
        projectFetched.metadataRef,
      );

      const packages = await client.fetchWorkPackagesForProject(projectKey);
      const allRoleAssignments: Fetched<RoleAssignmentAccount>[] = [];
      const allRequests: Fetched<PaymentRequestAccount>[] = [];
      const allApprovals: Fetched<ApprovalRecord>[] = [];

      const packageRows: PackageRow[] = [];
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
        const scope = await metadata.resolvePackageScope(pkg.account.scopeRef);
        packageRows.push({
          rollup: selectPackageRollup(pkg, activeRequest),
          scope,
          activeRequest,
        });
      }

      const projectRollup = selectProjectRollup(
        wrappedProject,
        packageRows.map((p) => p.rollup),
      );

      const baseTimeline = selectAuditTimeline({
        project: wrappedProject,
        roleAssignments: allRoleAssignments,
        paymentRequests: allRequests,
        approvals: allApprovals,
      });

      // Resolve actor display names from team metadata + ref-backed text
      const teamByWallet = new Map<string, string>();
      for (const member of projectMetadata?.team ?? []) {
        teamByWallet.set(member.wallet, member.displayName);
      }
      const enriched: EnrichedAuditEvent[] = [];
      for (const event of baseTimeline) {
        const actorDisplayName = event.actor
          ? (teamByWallet.get(event.actor.toBase58()) ?? null)
          : null;
        const detail = await resolveEventDetail(metadata, event);
        enriched.push({ ...event, actorDisplayName, detail });
      }

      // Display newest first.
      enriched.reverse();

      if (!cancelled) {
        setLoaded({
          rollup: projectRollup,
          metadata: projectMetadata,
          packages: packageRows,
          timeline: enriched,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, metadata, projectKey]);

  if (!projectKey || loaded === "missing") {
    return (
      <section className="project-detail">
        <BackLink />
        <div className="project-detail__missing">
          <h1>Project not found</h1>
          <p>
            {projectKey
              ? "The address in the URL didn't match any seeded project."
              : "Missing or invalid `address` query parameter."}{" "}
            Try heading back to the project list.
          </p>
        </div>
      </section>
    );
  }

  if (loaded === null) {
    return <div className="project-detail__loading">Loading project…</div>;
  }

  const { rollup, metadata: meta, packages, timeline } = loaded;

  return (
    <section className="project-detail">
      <BackLink />

      <header className="project-detail__head">
        <div className="project-detail__title">
          <h1>{rollup.project.name}</h1>
          <StatusPill
            tone={rollup.project.status === "completed" ? "success" : "info"}
          >
            {projectStatusLabel(rollup.project.status)}
          </StatusPill>
        </div>
        {meta && (
          <p className="project-detail__client">
            Client · <strong>{meta.client}</strong>
            {meta.startDate && meta.endDate && (
              <>
                <span className="dot" aria-hidden="true">
                  ·
                </span>
                {meta.startDate} → {meta.endDate}
              </>
            )}
          </p>
        )}
        {meta?.description && (
          <p className="project-detail__description">{meta.description}</p>
        )}
        <dl className="project-detail__metrics">
          <Metric label="Packages">{rollup.packageCount}</Metric>
          <Metric label="Total cap">
            <Money amount={rollup.totalCap} withSymbol />
          </Metric>
          <Metric label="Funded">
            <Money amount={rollup.totalFunded} withSymbol />
          </Metric>
          <Metric label="Released">
            <Money amount={rollup.totalReleased} withSymbol />
          </Metric>
          <Metric label="Outstanding">
            <Money amount={rollup.totalOutstandingFunded} withSymbol />
          </Metric>
          <Metric label="Holds">{rollup.heldPackageCount}</Metric>
        </dl>
      </header>

      <div className="project-detail__columns">
        <main className="project-detail__main">
          <h2 className="project-detail__section-heading">Work packages</h2>
          <ul className="project-detail__packages">
            {packages.map((row) => (
              <PackageCard key={row.rollup.address.toBase58()} row={row} />
            ))}
          </ul>

          <h2 className="project-detail__section-heading">Audit log</h2>
          <ol className="project-detail__timeline">
            {timeline.map((event, idx) => (
              <li
                key={`${event.kind}-${event.at}-${idx}`}
                className="project-detail__event"
              >
                <time className="project-detail__event-time">
                  {formatTimestamp(event.at)}
                </time>
                <div className="project-detail__event-body">
                  <p className="project-detail__event-label">
                    {event.actorDisplayName ? (
                      <>
                        <strong>{event.actorDisplayName}</strong> ·{" "}
                      </>
                    ) : event.actor ? (
                      <>
                        <span className="project-detail__event-wallet">
                          {shortAddress(event.actor.toBase58())}
                        </span>{" "}
                        ·{" "}
                      </>
                    ) : null}
                    {event.label}
                  </p>
                  {event.detail && (
                    <p className="project-detail__event-detail">
                      {event.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </main>

        <aside className="project-detail__aside">
          <h2 className="project-detail__section-heading">Team</h2>
          {meta ? (
            <ul className="project-detail__team">
              {meta.team.map((member) => (
                <li key={member.wallet} className="project-detail__team-member">
                  <div>
                    <p className="project-detail__team-name">
                      {member.displayName}
                    </p>
                    <p className="project-detail__team-org">{member.org}</p>
                  </div>
                  <StatusPill tone="info">
                    {teamRoleLabel(member.role)}
                  </StatusPill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="project-detail__team-empty">
              No team metadata available.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
};

const resolveEventDetail = async (
  metadata: ReturnType<typeof useClients>["metadata"],
  event: AuditEvent,
): Promise<string | null> => {
  if (!event.ref) return null;
  switch (event.kind) {
    case "requestSubmitted": {
      const doc = await metadata.resolveDocument(event.ref);
      return doc?.filename ?? null;
    }
    case "requestLowApproved":
    case "requestHighApproved":
    case "requestRejected": {
      const note = await metadata.resolveNote(event.ref);
      return note?.text ?? null;
    }
    case "holdActive": {
      const hold = await metadata.resolveHold(event.ref);
      return hold?.reason ?? null;
    }
    default:
      return null;
  }
};

const BackLink = () => (
  <a className="project-detail__back" href="#projects">
    ← All projects
  </a>
);

const Metric = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="project-detail__metric">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

const PackageCard = ({ row }: { row: PackageRow }) => {
  const wpHref = buildHash("workPackageView", {
    address: row.rollup.address.toBase58(),
  });
  const status: WorkPackageAccount["status"] = row.rollup.package.status;
  const requestStatus = row.activeRequest
    ? paymentRequestDisplayStatus(row.activeRequest)
    : null;
  return (
    <li className="project-detail__package">
      <a className="project-detail__package-link" href={wpHref}>
        <header className="project-detail__package-head">
          <h3>
            {row.scope?.description?.split(".")[0] ??
              row.rollup.package.scopeRef}
          </h3>
          <StatusPill
            tone={
              status === "completed"
                ? "success"
                : status === "cancelled"
                  ? "neutral"
                  : "info"
            }
          >
            {workPackageStatusLabel(status)}
          </StatusPill>
        </header>
        <dl className="project-detail__package-metrics">
          <Metric label="Cap">
            <Money amount={row.rollup.package.capAmount} withSymbol />
          </Metric>
          <Metric label="Funded">
            <Money amount={row.rollup.package.fundedAmount} withSymbol />
          </Metric>
          <Metric label="Released">
            <Money amount={row.rollup.package.releasedAmount} withSymbol />
          </Metric>
        </dl>
        {requestStatus && (
          <div className="project-detail__package-request">
            <StatusPill tone={paymentRequestChipTone(requestStatus)}>
              {paymentRequestStatusLabel(requestStatus)}
            </StatusPill>
            {row.activeRequest && (
              <Money amount={row.activeRequest.amount} withSymbol />
            )}
          </div>
        )}
      </a>
    </li>
  );
};
