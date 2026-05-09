import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
import { walletForRole } from "../lib/clients";
import {
  formatMockUsdc,
  formatTimestamp,
  parseMockUsdc,
  shortAddress,
} from "../lib/format";
import {
  documentMetadataRef,
  holdMetadataRef,
  nextDocumentVersion,
  nextPaymentRequestId,
  noteMetadataRef,
} from "../lib/ids";
import { friendlyClientError } from "../lib/program";
import { teamRoleLabel } from "../lib/metadataClient";
import {
  paymentRequestChipTone,
  paymentRequestDisplayStatus,
  paymentRequestStatusLabel,
  isPaymentRequestActive,
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
  MilestoneAccount,
  PaymentRequestAccount,
  ProjectAccount,
  Role,
  WorkPackageAccount,
} from "../lib/program";
import type {
  DocumentMetadata,
  MetadataWriter,
  PackageScopeMetadata,
  ProjectMetadata,
  TeamMember,
} from "../lib/metadataClient";
import type { DemoRole } from "../lib/theme";
import { DEMO_ROLE_LABEL } from "../lib/theme";
import "./WorkPackageViewPage.css";

interface ActionFeedback {
  kind: "success" | "error";
  message: string;
}

interface RequestRow {
  request: Fetched<PaymentRequestAccount>;
  approvals: ApprovalTracker;
  displayStatus: PaymentRequestDisplayStatus;
  documentMetadata: DocumentMetadata | null;
  milestone: Fetched<MilestoneAccount> | null;
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
  milestones: Fetched<MilestoneAccount>[];
  requests: RequestRow[];
  timeline: EnrichedAuditEvent[];
  teamMembers: TeamMember[];
  contractorDisplayName: string;
}

interface WorkPackageViewPageProps {
  /** base58 work package address from `?address=` query param. */
  address?: string;
  role: DemoRole;
}

const tryDecode = (address?: string): PublicKey | null => {
  if (!address) return null;
  try {
    return new PublicKey(address);
  } catch {
    return null;
  }
};

export const WorkPackageViewPage = ({
  address,
  role,
}: WorkPackageViewPageProps) => {
  const { client, metadata, metadataWriter, world } = useClients();
  const packageKey = useMemo(() => tryDecode(address), [address]);
  const [loaded, setLoaded] = useState<LoadedDetail | null | "missing">(null);
  const [selectedRequestAddress, setSelectedRequestAddress] = useState<
    string | null
  >(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [pending, setPending] = useState(false);
  const wallet = walletForRole(world, role);

  useEffect(() => {
    if (!packageKey) return;
    let cancelled = false;
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

      const [scope, projectMetadata, roleAssignments, requests, milestones] =
        await Promise.all([
          metadata.resolvePackageScope(pkg.scopeRef),
          metadata.resolveProject(projectFetched.metadataRef),
          client.fetchRoleAssignmentsForPackage(packageKey),
          client.fetchPaymentRequestsForPackage(packageKey),
          client.fetchMilestonesForPackage(packageKey),
        ]);
      const milestonesByAddress = new Map(
        milestones.map((m) => [m.address.toBase58(), m]),
      );

      const allApprovals: Fetched<ApprovalRecord>[] = [];
      const requestRows: RequestRow[] = [];
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
          milestone: r.account.hasMilestone
            ? (milestonesByAddress.get(r.account.milestone.toBase58()) ?? null)
            : null,
          isActive:
            (pkg.hasActiveRequest && pkg.activeRequest.equals(r.address)) ||
            (r.account.hasMilestone && isPaymentRequestActive(r.account)),
        });
      }

      const activeRequestRow = requestRows.find((r) => r.isActive) ?? null;
      const activeRequest = activeRequestRow?.request.account ?? null;
      const activeRequestAddress = activeRequestRow?.request.address ?? null;

      const baseTimeline = selectAuditTimeline({
        project: wrappedProject,
        roleAssignments,
        paymentRequests: requests,
        approvals: allApprovals,
      });
      const scopedTimeline = baseTimeline.filter((event) => {
        if (event.kind === "projectCreated") return false;
        if (!event.workPackageAddress) return false;
        return event.workPackageAddress.equals(packageKey);
      });

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

      const rollup = selectPackageRollup(
        wrappedPackage,
        activeRequest,
        activeRequestAddress,
      );

      if (!cancelled) {
        setLoaded({
          packageAddress: packageKey,
          rollup,
          scope,
          project: wrappedProject,
          projectMetadata,
          milestones,
          requests: requestRows,
          timeline: enriched,
          teamMembers,
          contractorDisplayName,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, metadata, packageKey, refreshKey]);

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
    milestones,
    requests,
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

  const onAct = async (op: () => Promise<{ signature: string }>) => {
    setPending(true);
    setFeedback(null);
    try {
      const result = await op();
      setFeedback({
        kind: "success",
        message: `Submitted · ${shortAddress(result.signature, {
          head: 6,
          tail: 6,
        })}`,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        kind: "error",
        message: friendlyClientError(err),
      });
    } finally {
      setPending(false);
    }
  };

  const walletDisplayName =
    teamMembers.find((m) => m.wallet === wallet.toBase58())?.displayName ??
    null;
  const activeRequestRows = requests.filter((row) => row.isActive);
  const activeRequestRow =
    activeRequestRows.find(
      (row) => row.request.address.toBase58() === selectedRequestAddress,
    ) ??
    activeRequestRows[0] ??
    null;
  const resolvedSelectedRequestAddress =
    activeRequestRow?.request.address.toBase58() ?? null;
  const activeRequest = activeRequestRow?.request.account ?? null;
  const activeRequestAddress = activeRequestRow?.request.address ?? null;
  const releaseReadiness = activeRequest
    ? selectReleaseReadiness(activeRequest, rollup.package)
    : null;

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

          <MilestoneSchedulePanel
            milestones={milestones}
            scope={scope}
            requests={requests}
          />

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
            <DocumentPanel
              rows={requests}
              role={role}
              wallet={wallet}
              walletDisplayName={walletDisplayName}
              contractor={rollup.package.contractor}
              activeRequest={activeRequest}
              activeRequestRow={activeRequestRow}
              activeRequestAddress={activeRequestAddress}
              project={loaded.project.address}
              workPackage={loaded.packageAddress}
              pending={pending}
              onAct={onAct}
              client={client}
              metadataWriter={metadataWriter}
            />
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
          <ActiveRequestPanel
            rows={activeRequestRows}
            selectedAddress={resolvedSelectedRequestAddress}
            onSelect={setSelectedRequestAddress}
          />
          <ActionPanel
            role={role}
            wallet={wallet}
            walletDisplayName={walletDisplayName}
            project={loaded.project.address}
            workPackage={loaded.packageAddress}
            packageStatus={rollup.package.status}
            contractor={rollup.package.contractor}
            milestones={milestones}
            activeRequest={activeRequestRow}
            activeRequestAddress={activeRequestAddress}
            releaseReadiness={releaseReadiness}
            pending={pending}
            feedback={feedback}
            onAct={onAct}
            client={client}
            metadataWriter={metadataWriter}
          />
          <ApprovalTrackerPanel
            row={activeRequestRow}
            teamMembers={teamMembers}
          />
          <ReleaseReadinessPanel
            readiness={releaseReadiness}
            hasActive={Boolean(activeRequest)}
          />
          <RolesPanel
            assignments={teamMembers}
            workPackageContractor={rollup.package.contractor.toBase58()}
            isFinance={role === "financeDirector"}
            onAct={onAct}
            pending={pending}
            client={client}
            project={loaded.project.address}
            workPackage={loaded.packageAddress}
            wallet={wallet}
            world={world}
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

const MilestoneSchedulePanel = ({
  milestones,
  scope,
  requests,
}: {
  milestones: Fetched<MilestoneAccount>[];
  scope: PackageScopeMetadata | null;
  requests: RequestRow[];
}) => {
  if (milestones.length === 0) return null;
  const milestoneMeta = new Map(
    (scope?.internalMilestones ?? []).map((m) => [m.id, m]),
  );
  const requestsByMilestone = new Map<string, RequestRow[]>();
  for (const row of requests) {
    if (!row.request.account.hasMilestone) continue;
    const key = row.request.account.milestone.toBase58();
    requestsByMilestone.set(key, [
      ...(requestsByMilestone.get(key) ?? []),
      row,
    ]);
  }

  return (
    <section className="work-package-view__panel">
      <div className="work-package-view__panel-head">
        <h2>Milestone schedule</h2>
        <span className="work-package-view__panel-eyebrow">
          {milestones.length} release rules
        </span>
      </div>
      <ol className="work-package-view__milestones">
        {[...milestones]
          .sort((a, b) =>
            a.account.milestoneId < b.account.milestoneId ? -1 : 1,
          )
          .map((milestone) => {
            const id = milestone.account.milestoneId.toString();
            const meta = milestoneMeta.get(id);
            const linkedRequests =
              requestsByMilestone.get(milestone.address.toBase58()) ?? [];
            const hasActive = linkedRequests.some((row) =>
              isPaymentRequestActive(row.request.account),
            );
            return (
              <li
                className="work-package-view__milestone"
                key={milestone.address.toBase58()}
              >
                <div>
                  <p className="work-package-view__milestone-title">
                    {id}. {meta?.name ?? milestone.account.metadataRef}
                  </p>
                  <p className="work-package-view__milestone-dates">
                    {formatTimestamp(milestone.account.startAt)} -{" "}
                    {formatTimestamp(milestone.account.endAt)}
                  </p>
                  {meta?.targetDate && (
                    <p className="work-package-view__milestone-target">
                      Target {meta.targetDate}
                    </p>
                  )}
                </div>
                <div className="work-package-view__milestone-values">
                  <Money amount={milestone.account.amount} withSymbol />
                  <span>
                    Released{" "}
                    <Money
                      amount={milestone.account.releasedAmount}
                      withSymbol
                    />
                  </span>
                </div>
                <StatusPill
                  tone={
                    milestone.account.status === "completed"
                      ? "success"
                      : hasActive
                        ? "info"
                        : "neutral"
                  }
                >
                  {milestone.account.status === "completed"
                    ? "Paid"
                    : hasActive
                      ? "Invoiced"
                      : "Uninvoiced"}
                </StatusPill>
              </li>
            );
          })}
      </ol>
    </section>
  );
};

const ActiveRequestPanel = ({
  rows,
  selectedAddress,
  onSelect,
}: {
  rows: RequestRow[];
  selectedAddress: string | null;
  onSelect: (address: string) => void;
}) => {
  if (rows.length <= 1) return null;
  return (
    <section className="work-package-view__aside-panel">
      <h2>Active request</h2>
      <p className="work-package-view__aside-note">
        This package has parallel milestone requests in flight. Choose which one
        the action panels should target.
      </p>
      <select
        className="work-package-view__request-picker"
        value={selectedAddress ?? rows[0].request.address.toBase58()}
        onChange={(e) => onSelect(e.target.value)}
      >
        {rows.map((row) => {
          const label = row.milestone
            ? `Milestone ${row.milestone.account.milestoneId.toString()}`
            : "Package";
          return (
            <option
              key={row.request.address.toBase58()}
              value={row.request.address.toBase58()}
            >
              Request #{row.request.account.requestId.toString()} - {label} -{" "}
              {paymentRequestStatusLabel(row.displayStatus)}
            </option>
          );
        })}
      </select>
    </section>
  );
};

const pctOf = (part: bigint, whole: bigint): number => {
  if (whole <= 0n) return 0;
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
        {row.milestone && (
          <Metric label="Milestone">
            #{row.milestone.account.milestoneId.toString()}
          </Metric>
        )}
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
          label="Optional high"
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
  const renderName = (walletPk: PublicKey | null): string => {
    if (!walletPk) return "—";
    const m = teamByWallet.get(walletPk.toBase58());
    return m?.displayName ?? shortAddress(walletPk.toBase58());
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
            Optional high approval
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

interface RolesPanelProps {
  assignments: TeamMember[];
  workPackageContractor: string;
  isFinance: boolean;
  onAct: (op: () => Promise<{ signature: string }>) => Promise<void>;
  pending: boolean;
  client: ReturnType<typeof useClients>["client"];
  project: PublicKey;
  workPackage: PublicKey;
  wallet: PublicKey;
  world: ReturnType<typeof useClients>["world"];
}

const RolesPanel = ({
  assignments,
  workPackageContractor,
  isFinance,
  onAct,
  pending,
  client,
  project,
  workPackage,
  wallet,
  world,
}: RolesPanelProps) => {
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignWalletText, setAssignWalletText] = useState(
    world.pm.publicKey.toBase58(),
  );
  const [assignWalletError, setAssignWalletError] = useState<string | null>(
    null,
  );
  const [assignRole, setAssignRole] = useState<
    "lowApprover" | "highApprover" | "contractor"
  >("lowApprover");

  const onAssignSubmit = () => {
    let assignedWallet: PublicKey;
    try {
      assignedWallet = new PublicKey(assignWalletText.trim());
    } catch {
      setAssignWalletError("Invalid wallet address");
      return;
    }
    setAssignWalletError(null);
    void onAct(() =>
      client.assignRole({
        authority: wallet,
        project,
        workPackage,
        role: assignRole as Role,
        wallet: assignedWallet,
      }),
    ).then(() => {
      setAssignOpen(false);
      setAssignWalletText(world.pm.publicKey.toBase58());
      setAssignRole("lowApprover");
    });
  };

  return (
    <section className="work-package-view__aside-panel">
      <h2>Team</h2>
      {isFinance && (
        <div className="work-package-view__assign">
          {!assignOpen ? (
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--ghost"
              onClick={() => setAssignOpen(true)}
              disabled={pending}
            >
              Assign role…
            </button>
          ) : (
            <div className="work-package-view__reject-form">
              <label className="work-package-view__reject-label">
                Wallet address
              </label>
              <input
                className="work-package-view__reject-input"
                type="text"
                value={assignWalletText}
                onChange={(e) => {
                  setAssignWalletText(e.target.value);
                  setAssignWalletError(null);
                }}
                disabled={pending}
                placeholder="base58 public key"
              />
              {assignWalletError && (
                <p className="work-package-view__form-error">
                  {assignWalletError}
                </p>
              )}
              <label className="work-package-view__reject-label">Role</label>
              <select
                className="work-package-view__reject-input"
                value={assignRole}
                onChange={(e) =>
                  setAssignRole(
                    e.target.value as
                      | "lowApprover"
                      | "highApprover"
                      | "contractor",
                  )
                }
                disabled={pending}
              >
                <option value="lowApprover">PM (Low Approver)</option>
                <option value="highApprover">Director (High Approver)</option>
                <option value="contractor">Contractor</option>
              </select>
              <div className="work-package-view__reject-actions">
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--ghost"
                  onClick={() => {
                    setAssignOpen(false);
                    setAssignWalletText(world.pm.publicKey.toBase58());
                    setAssignRole("lowApprover");
                    setAssignWalletError(null);
                  }}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--primary"
                  onClick={onAssignSubmit}
                  disabled={pending || assignWalletText.trim().length === 0}
                >
                  Assign
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {assignments.length === 0 ? (
        <p className="work-package-view__empty">No team metadata available.</p>
      ) : (
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
      )}
    </section>
  );
};

interface DocumentPanelProps {
  rows: RequestRow[];
  role: DemoRole;
  wallet: PublicKey;
  walletDisplayName: string | null;
  contractor: PublicKey;
  activeRequest: PaymentRequestAccount | null;
  activeRequestRow: RequestRow | null;
  activeRequestAddress: PublicKey | null;
  project: PublicKey;
  workPackage: PublicKey;
  pending: boolean;
  onAct: (op: () => Promise<{ signature: string }>) => Promise<void>;
  client: ReturnType<typeof useClients>["client"];
  metadataWriter: MetadataWriter | null;
}

const DocumentPanel = ({
  rows,
  role,
  wallet,
  walletDisplayName,
  contractor,
  activeRequest,
  activeRequestRow,
  activeRequestAddress,
  project,
  workPackage,
  pending,
  onAct,
  client,
  metadataWriter,
}: DocumentPanelProps) => {
  const [docText, setDocText] = useState("");

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

  const contractorIsSelf = wallet.equals(contractor);
  const isContractor = role === "contractor";
  const activeStatus = activeRequest
    ? paymentRequestDisplayStatus(activeRequest)
    : null;
  const isTerminal = activeStatus === "released" || activeStatus === "rejected";
  const showAddDoc =
    isContractor &&
    contractorIsSelf &&
    activeRequest != null &&
    !isTerminal &&
    activeRequestAddress != null;

  const onAddDoc = () => {
    if (!activeRequestAddress || !activeRequest) return;
    const filename = docText.trim();
    if (!filename) return;
    const version = nextDocumentVersion(
      activeRequest.documentRef,
      activeRequestRow?.documentMetadata?.version,
    );
    const uploadedAt = new Date().toISOString();
    const docRef = documentMetadataRef(
      workPackage,
      activeRequest.requestId,
      version,
    );
    void onAct(async () => {
      const result = await client.addDocumentReference({
        contractor: wallet,
        project,
        workPackage,
        paymentRequest: activeRequestAddress,
        documentRef: docRef,
      });
      metadataWriter?.putDocument(docRef, {
        filename,
        version,
        uploaderDisplayName:
          walletDisplayName ?? shortAddress(wallet.toBase58()),
        uploaderRole: "contractor",
        uploadedAt,
        documentType: "invoice",
      });
      return result;
    }).then(() => {
      setDocText("");
    });
  };

  return (
    <>
      {docs.length === 0 ? (
        <p className="work-package-view__empty">
          No documents linked yet. Documents are attached when contractors
          submit invoices or update document references on the active request.
        </p>
      ) : (
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
      )}

      {showAddDoc && (
        <div className="work-package-view__add-doc-form">
          <label className="work-package-view__reject-label">
            Add / update document
          </label>
          <input
            className="work-package-view__reject-input"
            type="text"
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            placeholder="Filename or description (e.g. Invoice-v2.pdf)"
            disabled={pending}
          />
          <div className="work-package-view__reject-actions">
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--ghost"
              onClick={() => setDocText("")}
              disabled={pending}
            >
              Clear
            </button>
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--primary"
              onClick={onAddDoc}
              disabled={pending || docText.trim().length === 0}
            >
              Upload ref
            </button>
          </div>
        </div>
      )}
    </>
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

interface ActionPanelProps {
  role: DemoRole;
  wallet: PublicKey;
  walletDisplayName: string | null;
  project: PublicKey;
  workPackage: PublicKey;
  packageStatus: WorkPackageAccount["status"];
  contractor: PublicKey;
  milestones: Fetched<MilestoneAccount>[];
  activeRequest: RequestRow | null;
  activeRequestAddress: PublicKey | null;
  releaseReadiness: ReleaseReadiness | null;
  pending: boolean;
  feedback: ActionFeedback | null;
  onAct: (op: () => Promise<{ signature: string }>) => Promise<void>;
  client: ReturnType<typeof useClients>["client"];
  metadataWriter: MetadataWriter | null;
}

const ActionPanel = ({
  role,
  wallet,
  walletDisplayName,
  project,
  workPackage,
  packageStatus,
  contractor,
  milestones,
  activeRequest,
  activeRequestAddress,
  releaseReadiness,
  pending,
  feedback,
  onAct,
  client,
  metadataWriter,
}: ActionPanelProps) => {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdText, setHoldText] = useState("");

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceAmountError, setInvoiceAmountError] = useState<string | null>(
    null,
  );
  const [invoiceDoc, setInvoiceDoc] = useState("");
  const [invoiceMilestone, setInvoiceMilestone] = useState("");

  const status = activeRequest?.displayStatus ?? null;
  const requestAddr = activeRequestAddress;

  const isFinance = role === "financeDirector";
  const isOnHold =
    status === "submittedOnHold" ||
    status === "lowApprovedOnHold" ||
    status === "highApprovedOnHold";
  const isHoldablePending =
    status === "submitted" ||
    status === "lowApproved" ||
    status === "highApproved";

  const canPmApprove = role === "projectManager" && status === "submitted";
  const canHighApprove = role === "director" && status === "lowApproved";
  const canRelease =
    isFinance && activeRequest != null && releaseReadiness?.ready === true;
  const canReject =
    (role === "projectManager" && status === "submitted") ||
    (role === "director" && status === "lowApproved");
  const canPlaceHold = isFinance && activeRequest != null && isHoldablePending;
  const canRemoveHold = isFinance && activeRequest != null && isOnHold;

  const isContractorAction = role === "contractor";
  const contractorIsSelf = wallet.equals(contractor);
  const isMilestonePackage = milestones.length > 0;
  const hasInvoiceableMilestone = milestones.some(
    (m) => m.account.status === "active" && !m.account.hasActiveRequest,
  );
  const canSubmitInvoice =
    isContractorAction &&
    contractorIsSelf &&
    packageStatus === "active" &&
    (!activeRequest || (isMilestonePackage && hasInvoiceableMilestone));

  const composeNoteRef = (
    kind: "approve" | "reject",
    authoredAt: string,
  ): string =>
    requestAddr ? noteMetadataRef(requestAddr, role, kind, authoredAt) : "";

  const composeHoldRef = (authoredAt: string): string =>
    requestAddr ? holdMetadataRef(requestAddr, authoredAt) : "";

  const writeNote = (ref: string, text: string, authoredAt: string) => {
    if (!metadataWriter) return;
    metadataWriter.putNote(ref, {
      text,
      authorDisplayName: walletDisplayName ?? shortAddress(wallet.toBase58()),
      authorRole: role === "projectManager" ? "projectManager" : "director",
      authoredAt,
    });
  };

  const writeHold = (ref: string, reason: string, authoredAt: string) => {
    if (!metadataWriter) return;
    metadataWriter.putHold(ref, {
      reason,
      authorDisplayName: walletDisplayName ?? shortAddress(wallet.toBase58()),
      authorRole: "financeDirector",
      authoredAt,
    });
  };

  const onApprove = () => {
    if (!requestAddr) return;
    const authoredAt = new Date().toISOString();
    const noteRef = composeNoteRef("approve", authoredAt);
    void onAct(async () => {
      const result = await client.approveRequest({
        approver: wallet,
        project,
        workPackage,
        paymentRequest: requestAddr,
        role: role === "projectManager" ? "lowApprover" : "highApprover",
        noteRef,
      });
      writeNote(noteRef, "", authoredAt);
      return result;
    });
  };

  const onReject = () => {
    if (!requestAddr) return;
    const text = rejectText.trim();
    if (text.length === 0) return;
    const authoredAt = new Date().toISOString();
    const noteRef = composeNoteRef("reject", authoredAt);
    void onAct(async () => {
      const result = await client.rejectRequest({
        approver: wallet,
        project,
        workPackage,
        paymentRequest: requestAddr,
        role: role === "projectManager" ? "lowApprover" : "highApprover",
        noteRef,
      });
      writeNote(noteRef, text, authoredAt);
      return result;
    }).then(() => {
      setRejectOpen(false);
      setRejectText("");
    });
  };

  const onRelease = () => {
    if (!requestAddr) return;
    void onAct(() =>
      client.releasePayment({
        authority: wallet,
        project,
        workPackage,
        paymentRequest: requestAddr,
        contractorTokenAccount: contractor,
      }),
    );
  };

  const onPlaceHold = () => {
    if (!requestAddr) return;
    const reason = holdText.trim();
    if (reason.length === 0) return;
    const authoredAt = new Date().toISOString();
    const holdRef = composeHoldRef(authoredAt);
    void onAct(async () => {
      const result = await client.placeHold({
        authority: wallet,
        project,
        workPackage,
        paymentRequest: requestAddr,
        holdRef,
      });
      writeHold(holdRef, reason, authoredAt);
      return result;
    }).then(() => {
      setHoldOpen(false);
      setHoldText("");
    });
  };

  const onRemoveHold = () => {
    if (!requestAddr) return;
    void onAct(() =>
      client.removeHold({
        authority: wallet,
        project,
        workPackage,
        paymentRequest: requestAddr,
      }),
    );
  };

  const onSubmitInvoice = () => {
    let parsedAmount: bigint;
    try {
      parsedAmount = parseMockUsdc(invoiceAmount);
    } catch (e) {
      setInvoiceAmountError(e instanceof Error ? e.message : "Invalid amount");
      return;
    }
    if (isMilestonePackage && invoiceMilestone.length === 0) {
      setInvoiceAmountError("Select a milestone for this invoice.");
      return;
    }
    setInvoiceAmountError(null);
    void onAct(async () => {
      const latestWorkPackage = await client.fetchWorkPackage(workPackage);
      if (!latestWorkPackage) {
        throw new Error("Work package no longer exists.");
      }
      const latestRequests =
        await client.fetchPaymentRequestsForPackage(workPackage);
      const requestId = nextPaymentRequestId(latestWorkPackage, latestRequests);
      const uploadedAt = new Date().toISOString();
      const docRef = documentMetadataRef(workPackage, requestId);
      const milestone = isMilestonePackage
        ? new PublicKey(invoiceMilestone)
        : null;
      const selectedMilestone = milestone
        ? milestones.find((m) => m.address.equals(milestone))?.account
        : null;
      const result = await client.submitPaymentRequest({
        contractor: wallet,
        project,
        workPackage,
        requestId,
        amount: parsedAmount,
        milestone,
        documentRef: docRef,
      });
      metadataWriter?.putDocument(docRef, {
        filename: invoiceDoc.trim() || "Invoice.pdf",
        version: 1,
        uploaderDisplayName:
          walletDisplayName ?? shortAddress(wallet.toBase58()),
        uploaderRole: "contractor",
        uploadedAt,
        documentType: "invoice",
        linkedPackageMilestoneId:
          selectedMilestone?.milestoneId.toString() ?? undefined,
      });
      return result;
    }).then(() => {
      setInvoiceOpen(false);
      setInvoiceAmount("");
      setInvoiceDoc("");
      setInvoiceMilestone("");
    });
  };

  const eyebrow = `${DEMO_ROLE_LABEL[role]} · acting as ${shortAddress(
    wallet.toBase58(),
  )}`;

  return (
    <section className="work-package-view__aside-panel work-package-view__action-panel">
      <h2>Actions</h2>
      <p className="work-package-view__aside-eyebrow">{eyebrow}</p>

      {!activeRequest && !isContractorAction && (
        <p className="work-package-view__empty">
          No active payment request to action.
        </p>
      )}

      {activeRequest && packageStatus !== "active" && (
        <p className="work-package-view__empty">
          Work package is no longer active.
        </p>
      )}

      {canSubmitInvoice && (
        <div className="work-package-view__reject">
          {!invoiceOpen ? (
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--primary"
              onClick={() => setInvoiceOpen(true)}
              disabled={pending}
            >
              Submit invoice…
            </button>
          ) : (
            <div className="work-package-view__reject-form">
              {isMilestonePackage && (
                <>
                  <label className="work-package-view__reject-label">
                    Milestone
                  </label>
                  <select
                    className="work-package-view__reject-input"
                    value={invoiceMilestone}
                    onChange={(e) => {
                      setInvoiceMilestone(e.target.value);
                      setInvoiceAmountError(null);
                    }}
                    disabled={pending}
                  >
                    <option value="">Select milestone</option>
                    {[...milestones]
                      .sort((a, b) =>
                        a.account.milestoneId < b.account.milestoneId ? -1 : 1,
                      )
                      .filter((m) => m.account.status === "active")
                      .map((m) => (
                        <option
                          key={m.address.toBase58()}
                          value={m.address.toBase58()}
                          disabled={m.account.hasActiveRequest}
                        >
                          {m.account.milestoneId.toString()} -{" "}
                          {m.account.hasActiveRequest
                            ? "request active"
                            : "available"}{" "}
                          -{" "}
                          {formatMockUsdc(m.account.amount, {
                            withSymbol: true,
                          })}
                        </option>
                      ))}
                  </select>
                </>
              )}
              <label className="work-package-view__reject-label">
                Invoice amount
              </label>
              <input
                className="work-package-view__reject-input"
                type="text"
                value={invoiceAmount}
                onChange={(e) => {
                  setInvoiceAmount(e.target.value);
                  setInvoiceAmountError(null);
                }}
                placeholder="e.g. 25000"
                disabled={pending}
              />
              {invoiceAmountError && (
                <p className="work-package-view__form-error">
                  {invoiceAmountError}
                </p>
              )}
              <label className="work-package-view__reject-label">
                Document (optional filename)
              </label>
              <input
                className="work-package-view__reject-input"
                type="text"
                value={invoiceDoc}
                onChange={(e) => setInvoiceDoc(e.target.value)}
                placeholder="Invoice.pdf"
                disabled={pending}
              />
              <div className="work-package-view__reject-actions">
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--ghost"
                  onClick={() => {
                    setInvoiceOpen(false);
                    setInvoiceAmount("");
                    setInvoiceAmountError(null);
                    setInvoiceDoc("");
                    setInvoiceMilestone("");
                  }}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--primary"
                  onClick={onSubmitInvoice}
                  disabled={
                    pending ||
                    invoiceAmount.trim().length === 0 ||
                    (isMilestonePackage && invoiceMilestone.length === 0)
                  }
                >
                  Submit invoice
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canPmApprove && (
        <div className="work-package-view__action-buttons">
          <button
            type="button"
            className="work-package-view__btn work-package-view__btn--primary"
            onClick={onApprove}
            disabled={pending}
          >
            Approve as PM
          </button>
        </div>
      )}

      {canHighApprove && (
        <div className="work-package-view__action-buttons">
          <button
            type="button"
            className="work-package-view__btn work-package-view__btn--primary"
            onClick={onApprove}
            disabled={pending}
          >
            Approve high step
          </button>
        </div>
      )}

      {canRelease && (
        <div className="work-package-view__action-buttons">
          <button
            type="button"
            className="work-package-view__btn work-package-view__btn--primary"
            onClick={onRelease}
            disabled={pending}
          >
            Release payment
          </button>
        </div>
      )}

      {canRemoveHold && (
        <div className="work-package-view__action-buttons">
          <button
            type="button"
            className="work-package-view__btn work-package-view__btn--primary"
            onClick={onRemoveHold}
            disabled={pending}
          >
            Remove hold
          </button>
        </div>
      )}

      {canPlaceHold && (
        <div className="work-package-view__reject">
          {!holdOpen ? (
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--ghost"
              onClick={() => setHoldOpen(true)}
              disabled={pending}
            >
              Place hold…
            </button>
          ) : (
            <div className="work-package-view__reject-form">
              <label className="work-package-view__reject-label">
                Reason (recorded with the hold)
              </label>
              <textarea
                className="work-package-view__reject-input"
                value={holdText}
                onChange={(e) => setHoldText(e.target.value)}
                rows={3}
                disabled={pending}
                placeholder="Why is this request being held?"
              />
              <div className="work-package-view__reject-actions">
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--ghost"
                  onClick={() => {
                    setHoldOpen(false);
                    setHoldText("");
                  }}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--danger"
                  onClick={onPlaceHold}
                  disabled={pending || holdText.trim().length === 0}
                >
                  Place hold
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canReject && (
        <div className="work-package-view__reject">
          {!rejectOpen ? (
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--ghost"
              onClick={() => setRejectOpen(true)}
              disabled={pending}
            >
              Reject…
            </button>
          ) : (
            <div className="work-package-view__reject-form">
              <label className="work-package-view__reject-label">
                Reason (will be recorded on the approval record)
              </label>
              <textarea
                className="work-package-view__reject-input"
                value={rejectText}
                onChange={(e) => setRejectText(e.target.value)}
                rows={3}
                disabled={pending}
                placeholder="What needs to change before this can be approved?"
              />
              <div className="work-package-view__reject-actions">
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--ghost"
                  onClick={() => {
                    setRejectOpen(false);
                    setRejectText("");
                  }}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--danger"
                  onClick={onReject}
                  disabled={pending || rejectText.trim().length === 0}
                >
                  Reject request
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No-op explainers so the panel never feels blank for a role. */}
      {activeRequest &&
        !canPmApprove &&
        !canHighApprove &&
        !canRelease &&
        !canPlaceHold &&
        !canRemoveHold &&
        !canSubmitInvoice && (
          <p className="work-package-view__empty">
            {role === "financeDirector"
              ? status === "released"
                ? "Already released."
                : status === "rejected"
                  ? "Request was rejected."
                  : "No finance action available."
              : role === "projectManager"
                ? status === "lowApproved" || status === "highApproved"
                  ? "Already PM-approved."
                  : status === "rejected"
                    ? "Request was rejected."
                    : status === "released"
                      ? "Already released."
                      : "Held — actions blocked."
                : role === "director"
                  ? status === "submitted"
                    ? "Awaiting PM approval first."
                    : status === "highApproved" || status === "released"
                      ? "Already high-approved."
                      : status === "rejected"
                        ? "Request was rejected."
                        : "Held — actions blocked."
                  : isContractorAction
                    ? contractorIsSelf
                      ? "Invoice already active — await approval."
                      : "Read-only — this isn't your assigned package."
                    : "No action available."}
          </p>
        )}

      {feedback && (
        <p
          className={`work-package-view__feedback work-package-view__feedback--${feedback.kind}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
};
