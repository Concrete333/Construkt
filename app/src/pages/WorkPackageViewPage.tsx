import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
import { formatTimestamp, shortAddress } from "../lib/format";
import { teamRoleLabel } from "../lib/metadataClient";
import {
  paymentRequestChipTone,
  paymentRequestDisplayStatus,
  paymentRequestStatusLabel,
  releaseBlockedReasonLabel,
  selectApprovalTracker,
  selectReleaseReadiness,
} from "../selectors/paymentSelectors";
import { selectAuditTimeline } from "../selectors/auditSelectors";
import { selectPackageRollup } from "../selectors/projectSelectors";
import type {
  ApprovalTracker,
  PaymentRequestDisplayStatus,
  ReleaseReadiness,
} from "../selectors/paymentSelectors";
import type { PackageRollup } from "../selectors/projectSelectors";
import type { AuditEvent } from "../selectors/auditSelectors";
import type {
  ApprovalRecord,
  Fetched,
  PaymentRequestAccount,
  ProjectAccount,
  WorkPackageAccount,
} from "../lib/program";
import type {
  DocumentMetadata,
  PackageScopeMetadata,
  ProjectMetadata,
  TeamMember,
} from "../lib/metadataClient";
import "./WorkPackageViewPage.css";

interface RequestRow {
  request: Fetched<PaymentRequestAccount>;
  approvals: ApprovalTracker;
  displayStatus: PaymentRequestDisplayStatus;
  documentMetadata: DocumentMetadata | null;
  isActive: boolean;
}

interface EnrichedAuditEvent extends AuditEvent {
  actorDisplayName: string | null;
  detail: string | null;
}

interface LoadedDetail {
  packageAddress: PublicKey;
  rollup: PackageRollup;
  scope: PackageScopeMetadata | null;
  project: Fetched<ProjectAccount>;
  projectMetadata: ProjectMetadata | null;
  requests: RequestRow[];
  activeRequest: PaymentRequestAccount | null;
  releaseReadiness: ReleaseReadiness | null;
  timeline: EnrichedAuditEvent[];
  teamMembers: TeamMember[];
  contractorDisplayName: string;
}

interface WorkPackageViewPageProps {
  /** base58 work package address from `?address=` query param. */
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

export const WorkPackageViewPage = ({ address }: WorkPackageViewPageProps) => {
  const { client, metadata } = useClients();
  const packageKey = useMemo(() => tryDecode(address), [address]);
  const [loaded, setLoaded] = useState<LoadedDetail | null | "missing">(null);

  useEffect(() => {
    if (!packageKey) return;
    let cancelled = false;
    // See ProjectDetailPage for why we don't synchronously reset to null on
    // address change (react-hooks/set-state-in-effect rule). Mock fetches
    // are instant; if Phase 4 introduces flicker, swap to a `key`-on-address
    // remount.
    void (async () => {
      const pkg = await client.fetchWorkPackage(packageKey);
      if (!pkg) {
        if (!cancelled) setLoaded("missing");
        return;
      }
      const wrappedPackage: Fetched<WorkPackageAccount> = {
        address: packageKey,
        account: pkg,
      };
      const projectFetched = await client.fetchProject(pkg.project);
      if (!projectFetched) {
        if (!cancelled) setLoaded("missing");
        return;
      }
      const wrappedProject: Fetched<ProjectAccount> = {
        address: pkg.project,
        account: projectFetched,
      };

      const [scope, projectMetadata, roleAssignments, requests] =
        await Promise.all([
          metadata.resolvePackageScope(pkg.scopeRef),
          metadata.resolveProject(projectFetched.metadataRef),
          client.fetchRoleAssignmentsForPackage(packageKey),
          client.fetchPaymentRequestsForPackage(packageKey),
        ]);

      const allApprovals: Fetched<ApprovalRecord>[] = [];
      const requestRows: RequestRow[] = [];
      // Sort requests newest-submitted first for display
      const sortedRequests = [...requests].sort((a, b) => {
        const aAt = a.account.submittedAt;
        const bAt = b.account.submittedAt;
        if (aAt < bAt) return 1;
        if (aAt > bAt) return -1;
        return 0;
      });
      for (const r of sortedRequests) {
        const approvals = await client.fetchApprovalsForRequest(r.address);
        allApprovals.push(...approvals);
        const documentMetadata = await metadata.resolveDocument(
          r.account.documentRef,
        );
        requestRows.push({
          request: r,
          approvals: selectApprovalTracker(approvals),
          displayStatus: paymentRequestDisplayStatus(r.account),
          documentMetadata,
          isActive: pkg.hasActiveRequest && pkg.activeRequest.equals(r.address),
        });
      }

      const activeRequest = pkg.hasActiveRequest
        ? (requestRows.find((r) => r.isActive)?.request.account ?? null)
        : null;
      const releaseReadiness = activeRequest
        ? selectReleaseReadiness(activeRequest, pkg)
        : null;

      const baseTimeline = selectAuditTimeline({
        project: wrappedProject,
        roleAssignments,
        paymentRequests: requests,
        approvals: allApprovals,
      });
      // Filter timeline to events for this package only.
      const scopedTimeline = baseTimeline.filter((event) => {
        if (event.kind === "projectCreated") return false;
        if (!event.workPackageAddress) return false;
        return event.workPackageAddress.equals(packageKey);
      });

      // Build wallet → display name map from project team metadata.
      const teamByWallet = new Map<string, string>();
      const teamMembers: TeamMember[] = [];
      for (const member of projectMetadata?.team ?? []) {
        teamByWallet.set(member.wallet, member.displayName);
        teamMembers.push(member);
      }

      const enriched: EnrichedAuditEvent[] = [];
      for (const event of scopedTimeline) {
        const actorDisplayName = event.actor
          ? (teamByWallet.get(event.actor.toBase58()) ?? null)
          : null;
        const detail = await resolveEventDetail(metadata, event);
        enriched.push({ ...event, actorDisplayName, detail });
      }
      enriched.reverse();

      const contractorDisplayName =
        scope?.contractorDisplayName ??
        teamByWallet.get(pkg.contractor.toBase58()) ??
        shortAddress(pkg.contractor.toBase58());

      const rollup = selectPackageRollup(wrappedPackage, activeRequest);

      if (!cancelled) {
        setLoaded({
          packageAddress: packageKey,
          rollup,
          scope,
          project: wrappedProject,
          projectMetadata,
          requests: requestRows,
          activeRequest,
          releaseReadiness,
          timeline: enriched,
          teamMembers,
          contractorDisplayName,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, metadata, packageKey]);

  if (!packageKey || loaded === "missing") {
    return (
      <section className="work-package-view">
        <BackLink />
        <div className="work-package-view__missing">
          <h1>Work package not found</h1>
          <p>
            {packageKey
              ? "The address in the URL didn't match any seeded work package."
              : "Missing or invalid `address` query parameter."}{" "}
            Try heading back to the project list.
          </p>
        </div>
      </section>
    );
  }

  if (loaded === null) {
    return (
      <div className="work-package-view__loading">Loading work package…</div>
    );
  }

  const {
    rollup,
    scope,
    project,
    projectMetadata,
    requests,
    activeRequest,
    releaseReadiness,
    timeline,
    teamMembers,
    contractorDisplayName,
  } = loaded;

  const projectHref = buildHash("projectDetail", {
    address: project.address.toBase58(),
  });
  const heading =
    scope?.description?.split(".")[0] ??
    `Package #${rollup.package.packageId.toString()}`;

  return (
    <section className="work-package-view">
      <a className="work-package-view__back" href={projectHref}>
        ← Back to {project.account.name}
      </a>

      <header className="work-package-view__head">
        <div className="work-package-view__title">
          <p className="work-package-view__breadcrumb">
            {projectMetadata?.client ?? "—"}
            <span aria-hidden="true">·</span>
            {project.account.name}
          </p>
          <h1>{heading}</h1>
          <p className="work-package-view__contractor">
            Contractor · <strong>{contractorDisplayName}</strong>
            {scope?.contractorOrg && (
              <>
                <span aria-hidden="true">·</span>
                {scope.contractorOrg}
              </>
            )}
          </p>
          {scope?.description && (
            <p className="work-package-view__scope">{scope.description}</p>
          )}
        </div>
        <div className="work-package-view__addresses">
          <Address label="Package" value={rollup.address} />
          <Address label="Vault" value={rollup.package.vault} />
          <Address label="Mint" value={rollup.package.mint} />
        </div>
      </header>

      <div className="work-package-view__columns">
        <main className="work-package-view__main">
          <BalancePanel rollup={rollup} />

          <section className="work-package-view__panel">
            <div className="work-package-view__panel-head">
              <h2>Payment requests</h2>
              <span className="work-package-view__panel-eyebrow">
                {requests.length} total
              </span>
            </div>
            {requests.length === 0 ? (
              <p className="work-package-view__empty">
                No payment requests submitted yet.
              </p>
            ) : (
              <ul className="work-package-view__requests">
                {requests.map((row) => (
                  <RequestCard key={row.request.address.toBase58()} row={row} />
                ))}
              </ul>
            )}
          </section>

          <section className="work-package-view__panel">
            <div className="work-package-view__panel-head">
              <h2>Documents</h2>
              <span className="work-package-view__panel-eyebrow">
                Linked to active or past requests
              </span>
            </div>
            <DocumentPanel rows={requests} />
          </section>

          <section className="work-package-view__panel">
            <div className="work-package-view__panel-head">
              <h2>Audit log</h2>
              <span className="work-package-view__panel-eyebrow">
                Package events only
              </span>
            </div>
            {timeline.length === 0 ? (
              <p className="work-package-view__empty">
                No package activity yet.
              </p>
            ) : (
              <ol className="work-package-view__timeline">
                {timeline.map((event, idx) => (
                  <li
                    key={`${event.kind}-${event.at}-${idx}`}
                    className="work-package-view__event"
                  >
                    <time className="work-package-view__event-time">
                      {formatTimestamp(event.at)}
                    </time>
                    <div className="work-package-view__event-body">
                      <p className="work-package-view__event-label">
                        {event.actorDisplayName ? (
                          <>
                            <strong>{event.actorDisplayName}</strong> ·{" "}
                          </>
                        ) : event.actor ? (
                          <>
                            <span className="work-package-view__event-wallet">
                              {shortAddress(event.actor.toBase58())}
                            </span>{" "}
                            ·{" "}
                          </>
                        ) : null}
                        {event.label}
                      </p>
                      {event.detail && (
                        <p className="work-package-view__event-detail">
                          {event.detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </main>

        <aside className="work-package-view__aside">
          <ApprovalTrackerPanel
            row={requests.find((r) => r.isActive) ?? null}
            teamMembers={teamMembers}
          />
          <ReleaseReadinessPanel
            readiness={releaseReadiness}
            hasActive={Boolean(activeRequest)}
          />
          <RolesPanel
            assignments={teamMembers}
            workPackageContractor={rollup.package.contractor.toBase58()}
          />
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
  <a className="work-package-view__back" href="#projects">
    ← All projects
  </a>
);

const Address = ({ label, value }: { label: string; value: PublicKey }) => (
  <div className="work-package-view__address">
    <span className="work-package-view__address-label">{label}</span>
    <code className="work-package-view__address-value">
      {shortAddress(value.toBase58(), { head: 6, tail: 6 })}
    </code>
  </div>
);

const BalancePanel = ({ rollup }: { rollup: PackageRollup }) => {
  const cap = rollup.package.capAmount;
  const funded = rollup.package.fundedAmount;
  const released = rollup.package.releasedAmount;
  const outstanding = rollup.outstandingFunded;
  const remainingCap = rollup.remainingCapacity;

  const fundedPct = pctOf(funded, cap);
  const releasedPct = pctOf(released, cap);

  return (
    <section className="work-package-view__panel work-package-view__balance">
      <div className="work-package-view__panel-head">
        <h2>Escrow balance</h2>
        <span className="work-package-view__panel-eyebrow">
          Cap, funded, released
        </span>
      </div>
      <dl className="work-package-view__balance-metrics">
        <Metric label="Cap">
          <Money amount={cap} withSymbol />
        </Metric>
        <Metric label="Funded">
          <Money amount={funded} withSymbol />
        </Metric>
        <Metric label="Released">
          <Money amount={released} withSymbol />
        </Metric>
        <Metric label="Outstanding">
          <Money amount={outstanding} withSymbol />
        </Metric>
        <Metric label="Remaining cap">
          <Money amount={remainingCap} withSymbol />
        </Metric>
      </dl>
      <div className="work-package-view__bar" aria-hidden="true">
        <span
          className="work-package-view__bar-funded"
          style={{ width: `${fundedPct}%` }}
        />
        <span
          className="work-package-view__bar-released"
          style={{ width: `${releasedPct}%` }}
        />
      </div>
      <p className="work-package-view__bar-legend">
        <span>
          <i className="work-package-view__legend-dot is-funded" /> Funded
        </span>
        <span>
          <i className="work-package-view__legend-dot is-released" /> Released
        </span>
        <span>
          <i className="work-package-view__legend-dot is-cap" /> Cap headroom
        </span>
      </p>
    </section>
  );
};

const pctOf = (part: bigint, whole: bigint): number => {
  if (whole <= 0n) return 0;
  // Multiply by 10000 to get one decimal place of precision before dividing.
  const ratio = Number((part * 10000n) / whole) / 100;
  if (Number.isNaN(ratio)) return 0;
  if (ratio < 0) return 0;
  if (ratio > 100) return 100;
  return ratio;
};

const RequestCard = ({ row }: { row: RequestRow }) => {
  const { request, displayStatus, approvals, documentMetadata, isActive } = row;
  return (
    <li className="work-package-view__request">
      <header className="work-package-view__request-head">
        <div>
          <p className="work-package-view__request-id">
            Request #{request.account.requestId.toString()}
            {isActive && (
              <span className="work-package-view__request-active">Active</span>
            )}
          </p>
          <p className="work-package-view__request-amount">
            <Money amount={request.account.amount} withSymbol />
          </p>
        </div>
        <StatusPill tone={paymentRequestChipTone(displayStatus)}>
          {paymentRequestStatusLabel(displayStatus)}
        </StatusPill>
      </header>
      <dl className="work-package-view__request-meta">
        <Metric label="Submitted">
          {formatTimestamp(request.account.submittedAt)}
        </Metric>
        <Metric label="Updated">
          {formatTimestamp(request.account.updatedAt)}
        </Metric>
        {documentMetadata && (
          <Metric label="Document">{documentMetadata.filename}</Metric>
        )}
      </dl>
      <div className="work-package-view__approvals">
        <ApprovalSlot
          label="PM"
          state={approvals.lowApprover.state}
          at={approvals.lowApprover.at}
        />
        <ApprovalSlot
          label="Director"
          state={approvals.highApprover.state}
          at={approvals.highApprover.at}
        />
      </div>
    </li>
  );
};

const APPROVAL_TONES: Record<
  "pending" | "approved" | "rejected",
  "neutral" | "success" | "error"
> = {
  pending: "neutral",
  approved: "success",
  rejected: "error",
};

const APPROVAL_LABELS: Record<"pending" | "approved" | "rejected", string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const ApprovalSlot = ({
  label,
  state,
  at,
}: {
  label: string;
  state: "pending" | "approved" | "rejected";
  at: bigint | null;
}) => (
  <div className="work-package-view__approval-slot">
    <span className="work-package-view__approval-role">{label}</span>
    <StatusPill tone={APPROVAL_TONES[state]}>
      {APPROVAL_LABELS[state]}
    </StatusPill>
    {at !== null && (
      <span className="work-package-view__approval-at">
        {formatTimestamp(at)}
      </span>
    )}
  </div>
);

const ApprovalTrackerPanel = ({
  row,
  teamMembers,
}: {
  row: RequestRow | null;
  teamMembers: TeamMember[];
}) => {
  const teamByWallet = new Map(teamMembers.map((m) => [m.wallet, m]));
  if (!row) {
    return (
      <section className="work-package-view__aside-panel">
        <h2>Approval tracker</h2>
        <p className="work-package-view__empty">
          No active payment request to track.
        </p>
      </section>
    );
  }
  const renderName = (wallet: PublicKey | null): string => {
    if (!wallet) return "—";
    const m = teamByWallet.get(wallet.toBase58());
    return m?.displayName ?? shortAddress(wallet.toBase58());
  };
  return (
    <section className="work-package-view__aside-panel">
      <h2>Approval tracker</h2>
      <p className="work-package-view__aside-eyebrow">
        Active request #{row.request.account.requestId.toString()}
      </p>
      <ol className="work-package-view__tracker">
        <li className="work-package-view__tracker-step">
          <span className="work-package-view__tracker-role">PM approval</span>
          <StatusPill tone={APPROVAL_TONES[row.approvals.lowApprover.state]}>
            {APPROVAL_LABELS[row.approvals.lowApprover.state]}
          </StatusPill>
          <span className="work-package-view__tracker-meta">
            {renderName(row.approvals.lowApprover.approver)}
          </span>
        </li>
        <li className="work-package-view__tracker-step">
          <span className="work-package-view__tracker-role">
            Director approval
          </span>
          <StatusPill tone={APPROVAL_TONES[row.approvals.highApprover.state]}>
            {APPROVAL_LABELS[row.approvals.highApprover.state]}
          </StatusPill>
          <span className="work-package-view__tracker-meta">
            {renderName(row.approvals.highApprover.approver)}
          </span>
        </li>
        <li className="work-package-view__tracker-step">
          <span className="work-package-view__tracker-role">
            Finance release
          </span>
          <StatusPill
            tone={
              row.request.account.status === "released" ? "success" : "neutral"
            }
          >
            {row.request.account.status === "released" ? "Released" : "Pending"}
          </StatusPill>
          {row.request.account.status === "released" && (
            <span className="work-package-view__tracker-meta">
              {formatTimestamp(row.request.account.updatedAt)}
            </span>
          )}
        </li>
      </ol>
    </section>
  );
};

const ReleaseReadinessPanel = ({
  readiness,
  hasActive,
}: {
  readiness: ReleaseReadiness | null;
  hasActive: boolean;
}) => {
  if (!hasActive || !readiness) {
    return (
      <section className="work-package-view__aside-panel">
        <h2>Release readiness</h2>
        <p className="work-package-view__empty">
          No active request awaiting release.
        </p>
      </section>
    );
  }
  return (
    <section className="work-package-view__aside-panel">
      <h2>Release readiness</h2>
      {readiness.ready ? (
        <>
          <StatusPill tone="success">Ready to release</StatusPill>
          <p className="work-package-view__aside-note">
            All on-chain guards pass for this request. Finance can release the
            funded amount to the contractor token account.
          </p>
        </>
      ) : (
        <>
          <StatusPill tone="warning">Not ready</StatusPill>
          <ul className="work-package-view__readiness-reasons">
            {readiness.reasons.map((reason) => (
              <li key={reason}>{releaseBlockedReasonLabel(reason)}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

const RolesPanel = ({
  assignments,
  workPackageContractor,
}: {
  assignments: TeamMember[];
  workPackageContractor: string;
}) => {
  if (assignments.length === 0) {
    return (
      <section className="work-package-view__aside-panel">
        <h2>Team</h2>
        <p className="work-package-view__empty">No team metadata available.</p>
      </section>
    );
  }
  return (
    <section className="work-package-view__aside-panel">
      <h2>Team</h2>
      <ul className="work-package-view__roles">
        {assignments.map((member) => {
          const isPackageContractor = member.wallet === workPackageContractor;
          return (
            <li key={member.wallet} className="work-package-view__role">
              <div>
                <p className="work-package-view__role-name">
                  {member.displayName}
                </p>
                <p className="work-package-view__role-org">{member.org}</p>
              </div>
              <div className="work-package-view__role-pills">
                <StatusPill tone="info">
                  {teamRoleLabel(member.role)}
                </StatusPill>
                {isPackageContractor && (
                  <StatusPill tone="neutral">Assigned</StatusPill>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const DocumentPanel = ({ rows }: { rows: RequestRow[] }) => {
  // Build the list of unique documents linked across requests, freshest first.
  const seen = new Set<string>();
  const docs: Array<{
    requestId: bigint;
    documentRef: string;
    document: DocumentMetadata | null;
    submittedAt: bigint;
  }> = [];
  for (const row of rows) {
    const ref = row.request.account.documentRef;
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    docs.push({
      requestId: row.request.account.requestId,
      documentRef: ref,
      document: row.documentMetadata,
      submittedAt: row.request.account.submittedAt,
    });
  }
  if (docs.length === 0) {
    return (
      <p className="work-package-view__empty">
        No documents linked yet. Documents are attached when contractors submit
        invoices or update document references on the active request.
      </p>
    );
  }
  return (
    <ul className="work-package-view__documents">
      {docs.map((d) => (
        <li key={d.documentRef} className="work-package-view__document">
          <div className="work-package-view__document-icon">
            {d.document?.filename?.split(".").pop()?.toUpperCase() ?? "DOC"}
          </div>
          <div className="work-package-view__document-body">
            <p className="work-package-view__document-name">
              {d.document?.filename ?? d.documentRef}
            </p>
            <p className="work-package-view__document-meta">
              Request #{d.requestId.toString()} ·{" "}
              {d.document
                ? `v${d.document.version} · ${d.document.uploaderDisplayName}`
                : "Unknown uploader"}{" "}
              · {formatTimestamp(d.submittedAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
};

const Metric = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="work-package-view__metric">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);
