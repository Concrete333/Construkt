import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  documentRequestMetadataRef,
  holdMetadataRef,
  nextDocumentVersion,
  nextPaymentRequestId,
  noteMetadataRef,
  variationRequestMetadataRef,
  withdrawalClearanceMetadataRef,
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
import {
  selectPackageRollup,
  workPackageStatusLabel,
} from "../selectors/projectSelectors";
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
  DocumentRequestMetadata,
  MetadataWriter,
  PackageScopeMetadata,
  ProjectMetadata,
  TeamMember,
  VariationKind,
  VariationRequestMetadata,
  VariationStatus,
  WithdrawalClearanceMetadata,
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

type WorkPackageRecordsTab = "audit" | "documents" | "variations" | "payments";

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
  documentRequests: Array<[string, DocumentRequestMetadata]>;
  withdrawalClearances: Array<[string, WithdrawalClearanceMetadata]>;
  variationRequests: Array<[string, VariationRequestMetadata]>;
  timeline: EnrichedAuditEvent[];
  teamMembers: TeamMember[];
  hasHighApproverAssignment: boolean;
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

      const [
        scope,
        projectMetadata,
        roleAssignments,
        requests,
        milestones,
        documentRequests,
        withdrawalClearances,
        variationRequests,
      ] = await Promise.all([
        metadata.resolvePackageScope(pkg.scopeRef),
        metadata.resolveProject(projectFetched.metadataRef),
        client.fetchRoleAssignmentsForPackage(packageKey),
        client.fetchPaymentRequestsForPackage(packageKey),
        client.fetchMilestonesForPackage(packageKey),
        metadata.listDocumentRequestsForPackage(packageKey.toBase58()),
        metadata.listWithdrawalClearancesForPackage(packageKey.toBase58()),
        metadata.listVariationRequestsForPackage(packageKey.toBase58()),
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
      const hasHighApproverAssignment = roleAssignments.some(
        (assignment) =>
          assignment.account.active &&
          assignment.account.role === "highApprover",
      );

      const enriched: EnrichedAuditEvent[] = [];
      for (const event of scopedTimeline) {
        const actorDisplayName = event.actor
          ? (teamByWallet.get(event.actor.toBase58()) ?? null)
          : null;
        const detail = await resolveEventDetail(metadata, event);
        enriched.push({ ...event, actorDisplayName, detail });
      }
      enriched.reverse();

      const assignedContractorName = pkg.contractor.equals(PublicKey.default)
        ? null
        : (teamByWallet.get(pkg.contractor.toBase58()) ?? null);
      const contractorDisplayName =
        assignedContractorName ??
        scope?.contractorDisplayName ??
        (pkg.contractor.equals(PublicKey.default)
          ? "Unassigned estimate"
          : shortAddress(pkg.contractor.toBase58()));

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
          documentRequests,
          withdrawalClearances,
          variationRequests,
          timeline: enriched,
          teamMembers,
          hasHighApproverAssignment,
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
    documentRequests,
    withdrawalClearances,
    variationRequests,
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

  const onMetadataChange = (message: string) => {
    setFeedback({ kind: "success", message });
    setRefreshKey((k) => k + 1);
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
      <header className="work-package-view__header">
        <div className="work-package-view__heading">
          <a className="work-package-view__back" href={projectHref}>
            <span aria-hidden="true">←</span>
            Back to project
          </a>
          <p className="work-package-view__breadcrumb">
            Projects -&gt; {project.account.name} -&gt; Work Package
          </p>
          <h1 className="work-package-view__page-title">{heading}</h1>
          <p className="work-package-view__meta">
            <span>{projectMetadata?.client ?? "Client pending"}</span>
            <span>{contractorDisplayName}</span>
            {scope?.contractorOrg && <span>{scope.contractorOrg}</span>}
          </p>
          {scope?.description && (
            <p className="work-package-view__scope">{scope.description}</p>
          )}
        </div>
        <CurrentActionCard
          role={role}
          rollup={rollup}
          activeRequestRow={activeRequestRow}
          releaseReadiness={releaseReadiness}
          milestoneCount={milestones.length}
        />
      </header>

      <PackageInformationCard
        projectName={project.account.name}
        contractorName={contractorDisplayName}
        contractorOrg={scope?.contractorOrg ?? null}
        rollup={rollup}
        milestoneCount={milestones.length}
      />

      <div className="work-package-view__columns">
        <main className="work-package-view__main">
          <BalancePanel rollup={rollup} />

          <MilestoneSchedulePanel
            milestones={milestones}
            scope={scope}
            requests={requests}
          />

          <WorkPackageRecordsPanel
            requests={requests}
            highApprovalRequired={rollup.package.highApprovalRequired}
            timeline={timeline}
            role={role}
            wallet={wallet}
            walletDisplayName={walletDisplayName}
            contractor={rollup.package.contractor}
            activeRequest={activeRequest}
            activeRequestRow={activeRequestRow}
            activeRequestAddress={activeRequestAddress}
            documentRequests={documentRequests}
            variationRequests={variationRequests}
            milestones={milestones}
            project={loaded.project.address}
            workPackage={loaded.packageAddress}
            pending={pending}
            onAct={onAct}
            onMetadataChange={onMetadataChange}
            client={client}
            metadataWriter={metadataWriter}
          />

          <section className="work-package-view__panel">
            <div className="work-package-view__panel-head">
              <h2>Withdrawal</h2>
              <span className="work-package-view__panel-eyebrow">
                Contractor release clearing
              </span>
            </div>
            <WithdrawalPanel
              rows={requests}
              clearances={withdrawalClearances}
              role={role}
              wallet={wallet}
              walletDisplayName={walletDisplayName}
              packageContractor={rollup.package.contractor}
              workPackage={loaded.packageAddress}
              metadataWriter={metadataWriter}
              pending={pending}
              onMetadataChange={onMetadataChange}
            />
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
            highApprovalRequired={rollup.package.highApprovalRequired}
          />
          <ReleaseReadinessPanel
            readiness={releaseReadiness}
            hasActive={Boolean(activeRequest)}
          />
          <ApprovalPolicyPanel
            isFinance={role === "financeDirector"}
            highApprovalRequired={rollup.package.highApprovalRequired}
            packageStatus={rollup.package.status}
            hasInFlightRequest={rollup.package.reservedRequestAmount > 0n}
            hasHighApprover={loaded.hasHighApproverAssignment}
            pending={pending}
            onFlip={(next) =>
              void onAct(() =>
                client.updateHighApprovalPolicy({
                  authority: wallet,
                  project: loaded.project.address,
                  workPackage: loaded.packageAddress,
                  highApprovalRequired: next,
                }),
              )
            }
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

const CurrentActionCard = ({
  role,
  rollup,
  activeRequestRow,
  releaseReadiness,
  milestoneCount,
}: {
  role: DemoRole;
  rollup: PackageRollup;
  activeRequestRow: RequestRow | null;
  releaseReadiness: ReleaseReadiness | null;
  milestoneCount: number;
}) => {
  const status = activeRequestRow?.displayStatus ?? null;
  const request = activeRequestRow?.request.account ?? null;
  const milestoneLabel = activeRequestRow?.milestone
    ? `Milestone ${activeRequestRow.milestone.account.milestoneId.toString()}`
    : milestoneCount > 0
      ? `${milestoneCount} milestone rules`
      : "Package-level request";

  let title = "Package status";
  let detail = workPackageStatusLabel(rollup.package.status);
  let tone: "neutral" | "info" | "warning" | "success" | "error" = "neutral";

  if (request && activeRequestRow) {
    title =
      role === "projectManager" && status === "submitted"
        ? "Review submitted evidence"
        : role === "financeDirector" && releaseReadiness?.ready
          ? "Release-ready payment"
          : role === "director" && status === "lowApproved"
            ? "Director approval required"
            : role === "contractor"
              ? "Invoice in review"
              : "Active payment request";
    detail = `${paymentRequestStatusLabel(
      activeRequestRow.displayStatus,
    )} - ${milestoneLabel}`;
    tone = paymentRequestChipTone(activeRequestRow.displayStatus);
  } else if (
    role === "contractor" &&
    rollup.package.status === "active" &&
    rollup.package.releasedAmount < rollup.package.capAmount
  ) {
    title = "Submit invoice";
    detail =
      milestoneCount > 0
        ? "Choose an available milestone before submitting."
        : "Submit against the package balance.";
    tone = "info";
  } else if (
    role === "financeDirector" &&
    rollup.package.status === "active" &&
    rollup.remainingCapacity > 0n
  ) {
    title = "Fund remaining escrow";
    detail = `${formatMockUsdc(rollup.remainingCapacity, {
      withSymbol: true,
    })} remains unfunded.`;
    tone = "warning";
  } else if (rollup.package.status === "completed") {
    title = "Package complete";
    detail = "All package funds have been released.";
    tone = "success";
  }

  return (
    <aside className="work-package-view__current-action">
      <span className="work-package-view__current-eyebrow">
        {DEMO_ROLE_LABEL[role]}
      </span>
      <h2>{title}</h2>
      <p>{detail}</p>
      <StatusPill tone={tone}>
        {request && activeRequestRow
          ? paymentRequestStatusLabel(activeRequestRow.displayStatus)
          : workPackageStatusLabel(rollup.package.status)}
      </StatusPill>
    </aside>
  );
};

const PackageInformationCard = ({
  projectName,
  contractorName,
  contractorOrg,
  rollup,
  milestoneCount,
}: {
  projectName: string;
  contractorName: string;
  contractorOrg: string | null;
  rollup: PackageRollup;
  milestoneCount: number;
}) => (
  <section className="work-package-view__info-card">
    <h2 className="work-package-view__info-heading">Package Information</h2>
    <div className="work-package-view__info-grid">
      <InfoItem label="Project">{projectName}</InfoItem>
      <InfoItem label="Amount">
        <Money amount={rollup.package.capAmount} withSymbol />
      </InfoItem>
      <InfoItem label="Status">
        <StatusPill
          tone={
            rollup.package.status === "completed"
              ? "success"
              : rollup.package.status === "cancelled"
                ? "error"
                : rollup.package.status === "draft"
                  ? "warning"
                  : "info"
          }
        >
          {workPackageStatusLabel(rollup.package.status)}
        </StatusPill>
      </InfoItem>
      <InfoItem label="Funded">
        <Money amount={rollup.package.fundedAmount} withSymbol />
      </InfoItem>
      <InfoItem label="Released">
        <Money amount={rollup.package.releasedAmount} withSymbol />
      </InfoItem>
      <InfoItem label="Contractor">
        {contractorOrg
          ? `${contractorName} - ${contractorOrg}`
          : contractorName}
      </InfoItem>
      <InfoItem label="Package Type">
        {milestoneCount > 0 ? "Milestone package" : "Package payment"}
      </InfoItem>
      <InfoItem label="Approval Policy">
        {rollup.package.highApprovalRequired
          ? "PM + Director approval"
          : "PM approval"}
      </InfoItem>
    </div>
  </section>
);

const InfoItem = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="work-package-view__info-item">
    <span className="work-package-view__info-label">{label}</span>
    <span className="work-package-view__info-value">{children}</span>
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

const RECORD_TABS: Array<{ id: WorkPackageRecordsTab; label: string }> = [
  { id: "audit", label: "Audit Trail" },
  { id: "documents", label: "Documents" },
  { id: "variations", label: "Variations" },
  { id: "payments", label: "Payments" },
];

const WorkPackageRecordsPanel = ({
  requests,
  highApprovalRequired,
  timeline,
  role,
  wallet,
  walletDisplayName,
  contractor,
  activeRequest,
  activeRequestRow,
  activeRequestAddress,
  documentRequests,
  variationRequests,
  milestones,
  project,
  workPackage,
  pending,
  onAct,
  onMetadataChange,
  client,
  metadataWriter,
}: {
  requests: RequestRow[];
  highApprovalRequired: boolean;
  timeline: EnrichedAuditEvent[];
  role: DemoRole;
  wallet: PublicKey;
  walletDisplayName: string | null;
  contractor: PublicKey;
  activeRequest: PaymentRequestAccount | null;
  activeRequestRow: RequestRow | null;
  activeRequestAddress: PublicKey | null;
  documentRequests: Array<[string, DocumentRequestMetadata]>;
  variationRequests: Array<[string, VariationRequestMetadata]>;
  milestones: Fetched<MilestoneAccount>[];
  project: PublicKey;
  workPackage: PublicKey;
  pending: boolean;
  onAct: (op: () => Promise<{ signature: string }>) => Promise<void>;
  onMetadataChange: (message: string) => void;
  client: ReturnType<typeof useClients>["client"];
  metadataWriter: MetadataWriter | null;
}) => {
  const [activeTab, setActiveTab] = useState<WorkPackageRecordsTab>("audit");

  return (
    <section className="work-package-view__panel work-package-view__records">
      <div className="work-package-view__tabs">
        <div
          className="work-package-view__tab-buttons"
          role="tablist"
          aria-label="Work package records"
        >
          {RECORD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`work-package-view__tab ${
                activeTab === tab.id ? "is-active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="work-package-view__panel-eyebrow">
          Work package records
        </span>
      </div>

      {activeTab === "payments" && (
        <>
          {requests.length === 0 ? (
            <p className="work-package-view__empty">
              No payment requests submitted yet.
            </p>
          ) : (
            <ul className="work-package-view__requests">
              {requests.map((row) => (
                <RequestCard
                  key={row.request.address.toBase58()}
                  row={row}
                  highApprovalRequired={highApprovalRequired}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {activeTab === "documents" && (
        <DocumentPanel
          rows={requests}
          role={role}
          wallet={wallet}
          walletDisplayName={walletDisplayName}
          contractor={contractor}
          activeRequest={activeRequest}
          activeRequestRow={activeRequestRow}
          activeRequestAddress={activeRequestAddress}
          documentRequests={documentRequests}
          project={project}
          workPackage={workPackage}
          pending={pending}
          onAct={onAct}
          onMetadataChange={onMetadataChange}
          client={client}
          metadataWriter={metadataWriter}
        />
      )}

      {activeTab === "variations" && (
        <VariationPanel
          variations={variationRequests}
          role={role}
          wallet={wallet}
          walletDisplayName={walletDisplayName}
          contractor={contractor}
          workPackage={workPackage}
          milestones={milestones}
          pending={pending}
          metadataWriter={metadataWriter}
          onMetadataChange={onMetadataChange}
        />
      )}

      {activeTab === "audit" &&
        (timeline.length === 0 ? (
          <p className="work-package-view__empty">No package activity yet.</p>
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
        ))}
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

const VARIATION_KIND_LABEL: Record<VariationKind, string> = {
  scopeOnly: "Scope note",
  capChange: "Package cap change",
  milestoneAmount: "Milestone amount",
  milestoneSchedule: "Milestone schedule",
  contractorChange: "Contractor change",
  approvalPolicy: "Approval policy",
};

const VARIATION_STATUS_LABEL: Record<VariationStatus, string> = {
  submitted: "Submitted",
  pmApproved: "PM approved",
  financeApproved: "Finance approved",
  applied: "Applied",
  rejected: "Rejected",
};

const variationStatusTone = (
  status: VariationStatus,
): "neutral" | "info" | "warning" | "success" | "error" => {
  switch (status) {
    case "submitted":
      return "info";
    case "pmApproved":
    case "financeApproved":
      return "warning";
    case "applied":
      return "success";
    case "rejected":
      return "error";
  }
};

interface VariationPanelProps {
  variations: Array<[string, VariationRequestMetadata]>;
  role: DemoRole;
  wallet: PublicKey;
  walletDisplayName: string | null;
  contractor: PublicKey;
  workPackage: PublicKey;
  milestones: Fetched<MilestoneAccount>[];
  pending: boolean;
  metadataWriter: MetadataWriter | null;
  onMetadataChange: (message: string) => void;
}

const VariationPanel = ({
  variations,
  role,
  wallet,
  walletDisplayName,
  contractor,
  workPackage,
  milestones,
  pending,
  metadataWriter,
  onMetadataChange,
}: VariationPanelProps) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [kind, setKind] = useState<VariationKind>("scopeOnly");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountDeltaText, setAmountDeltaText] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [milestone, setMilestone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    metadataWriter !== null &&
    (role === "projectManager" ||
      (role === "contractor" && wallet.equals(contractor)));
  const sorted = [...variations].sort((a, b) =>
    b[1].requestedAt.localeCompare(a[1].requestedAt),
  );
  const needsAmount = kind === "capChange" || kind === "milestoneAmount";
  const needsDate = kind === "milestoneSchedule";
  const needsMilestone =
    kind === "milestoneAmount" || kind === "milestoneSchedule";

  const resetForm = () => {
    setCreateOpen(false);
    setKind("scopeOnly");
    setTitle("");
    setDescription("");
    setAmountDeltaText("");
    setTargetDate("");
    setMilestone("");
    setError(null);
  };

  const writeVariation = (
    ref: string,
    next: VariationRequestMetadata,
    message: string,
  ) => {
    if (!metadataWriter) return;
    metadataWriter.putVariationRequest(ref, next);
    onMetadataChange(message);
  };

  const onSubmit = () => {
    if (!metadataWriter) return;
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || !cleanDescription) {
      setError("Add a title and commercial note.");
      return;
    }
    if (needsMilestone && milestone.length === 0) {
      setError("Choose the affected milestone.");
      return;
    }

    let amountDelta: bigint | undefined;
    if (needsAmount) {
      try {
        amountDelta = parseMockUsdc(amountDeltaText);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid amount");
        return;
      }
      if (amountDelta === 0n) {
        setError("Variation amount cannot be zero.");
        return;
      }
    }
    if (needsDate && !targetDate) {
      setError("Choose the revised target date.");
      return;
    }

    const requestedAt = new Date().toISOString();
    const ref = variationRequestMetadataRef(workPackage, requestedAt);
    writeVariation(
      ref,
      {
        workPackage: workPackage.toBase58(),
        milestone: milestone || undefined,
        status: "submitted",
        kind,
        title: cleanTitle,
        description: cleanDescription,
        requestedByDisplayName:
          walletDisplayName ?? shortAddress(wallet.toBase58()),
        requestedByRole: role,
        requestedAt,
        amountDelta,
        targetDate: targetDate || undefined,
      },
      "Variation request recorded.",
    );
    resetForm();
  };

  const updateVariation = (
    ref: string,
    current: VariationRequestMetadata,
    status: VariationStatus,
  ) => {
    const actor = walletDisplayName ?? shortAddress(wallet.toBase58());
    const now = new Date().toISOString();
    const next: VariationRequestMetadata = { ...current, status };
    if (status === "pmApproved") {
      next.approvedByPmDisplayName = actor;
    } else if (status === "financeApproved") {
      next.approvedByFinanceDisplayName = actor;
    } else if (status === "applied") {
      next.appliedAt = now;
    } else if (status === "rejected") {
      next.rejectedByDisplayName = actor;
      next.rejectedAt = now;
    }
    writeVariation(
      ref,
      next,
      `Variation ${VARIATION_STATUS_LABEL[status].toLowerCase()}.`,
    );
  };

  return (
    <div className="work-package-view__variations">
      <div className="work-package-view__variation-head">
        <div>
          <h3>Variation requests</h3>
          <p>
            Commercial changes are recorded here first. Payment-control changes
            can later be promoted into the Solana variation flow.
          </p>
        </div>
        {canCreate && !createOpen && (
          <button
            className="work-package-view__btn work-package-view__btn--primary"
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={pending}
          >
            New variation
          </button>
        )}
      </div>

      {createOpen && (
        <div className="work-package-view__variation-form">
          <label className="work-package-view__reject-label">
            Variation type
            <select
              className="work-package-view__reject-input"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as VariationKind);
                setError(null);
              }}
              disabled={pending}
            >
              {Object.entries(VARIATION_KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="work-package-view__reject-label">
            Title
            <input
              className="work-package-view__reject-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
              placeholder="e.g. Revised access sequence"
            />
          </label>
          <label className="work-package-view__reject-label">
            Commercial note
            <textarea
              className="work-package-view__reject-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
              rows={3}
              placeholder="What changed, why, and what evidence supports it?"
            />
          </label>
          {needsMilestone && (
            <label className="work-package-view__reject-label">
              Affected milestone
              <select
                className="work-package-view__reject-input"
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                disabled={pending}
              >
                <option value="">Choose milestone</option>
                {milestones.map((m) => (
                  <option
                    key={m.address.toBase58()}
                    value={m.address.toBase58()}
                  >
                    Milestone {m.account.milestoneId.toString()}
                  </option>
                ))}
              </select>
            </label>
          )}
          {needsAmount && (
            <label className="work-package-view__reject-label">
              Amount change
              <input
                className="work-package-view__reject-input"
                value={amountDeltaText}
                onChange={(e) => setAmountDeltaText(e.target.value)}
                disabled={pending}
                placeholder="e.g. 25000"
                type="number"
              />
            </label>
          )}
          {needsDate && (
            <label className="work-package-view__reject-label">
              Revised target date
              <input
                className="work-package-view__reject-input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={pending}
                type="date"
              />
            </label>
          )}
          {error && <p className="work-package-view__form-error">{error}</p>}
          <div className="work-package-view__reject-actions">
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--ghost"
              onClick={resetForm}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--primary"
              onClick={onSubmit}
              disabled={pending}
            >
              Submit variation
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="work-package-view__empty">
          No variation requests recorded yet.
        </p>
      ) : (
        <ul className="work-package-view__variation-list">
          {sorted.map(([ref, variation]) => (
            <li key={ref} className="work-package-view__variation-card">
              <div className="work-package-view__variation-card-head">
                <div>
                  <p className="work-package-view__variation-title">
                    {variation.title}
                  </p>
                  <p className="work-package-view__document-meta">
                    {VARIATION_KIND_LABEL[variation.kind]} - requested by{" "}
                    {variation.requestedByDisplayName} -{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(variation.requestedAt))}
                  </p>
                </div>
                <StatusPill tone={variationStatusTone(variation.status)}>
                  {VARIATION_STATUS_LABEL[variation.status]}
                </StatusPill>
              </div>
              <p className="work-package-view__variation-description">
                {variation.description}
              </p>
              {(variation.amountDelta !== undefined ||
                variation.targetDate ||
                variation.milestone) && (
                <div className="work-package-view__variation-facts">
                  {variation.amountDelta !== undefined && (
                    <span>
                      Amount:{" "}
                      <Money amount={variation.amountDelta} withSymbol />
                    </span>
                  )}
                  {variation.targetDate && (
                    <span>Date: {variation.targetDate}</span>
                  )}
                  {variation.milestone && (
                    <span>Milestone: {shortAddress(variation.milestone)}</span>
                  )}
                </div>
              )}
              {variation.decisionNote && (
                <p className="work-package-view__variation-note">
                  {variation.decisionNote}
                </p>
              )}
              {metadataWriter && (
                <div className="work-package-view__action-buttons">
                  {role === "projectManager" &&
                    variation.status === "submitted" && (
                      <button
                        className="work-package-view__btn work-package-view__btn--primary"
                        type="button"
                        onClick={() =>
                          updateVariation(ref, variation, "pmApproved")
                        }
                        disabled={pending}
                      >
                        PM approve
                      </button>
                    )}
                  {role === "financeDirector" &&
                    variation.status === "pmApproved" && (
                      <button
                        className="work-package-view__btn work-package-view__btn--primary"
                        type="button"
                        onClick={() =>
                          updateVariation(ref, variation, "financeApproved")
                        }
                        disabled={pending}
                      >
                        Finance approve
                      </button>
                    )}
                  {role === "financeDirector" &&
                    variation.status === "financeApproved" && (
                      <button
                        className="work-package-view__btn work-package-view__btn--primary"
                        type="button"
                        onClick={() =>
                          updateVariation(ref, variation, "applied")
                        }
                        disabled={pending}
                      >
                        Mark applied
                      </button>
                    )}
                  {(role === "projectManager" || role === "financeDirector") &&
                    variation.status !== "applied" &&
                    variation.status !== "rejected" && (
                      <button
                        className="work-package-view__btn work-package-view__btn--danger"
                        type="button"
                        onClick={() =>
                          updateVariation(ref, variation, "rejected")
                        }
                        disabled={pending}
                      >
                        Reject
                      </button>
                    )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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

const RequestCard = ({
  row,
  highApprovalRequired,
}: {
  row: RequestRow;
  highApprovalRequired: boolean;
}) => {
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
          label={highApprovalRequired ? "Required high" : "Optional high"}
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
  highApprovalRequired,
}: {
  row: RequestRow | null;
  teamMembers: TeamMember[];
  highApprovalRequired: boolean;
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
            {highApprovalRequired
              ? "Required high approval"
              : "Optional high approval"}
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
            All approval and funding checks pass for this request. Finance can
            release the payment to the contractor.
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

interface ApprovalPolicyPanelProps {
  isFinance: boolean;
  highApprovalRequired: boolean;
  packageStatus: WorkPackageAccount["status"];
  hasInFlightRequest: boolean;
  hasHighApprover: boolean;
  pending: boolean;
  onFlip: (next: boolean) => void;
}

const ApprovalPolicyPanel = ({
  isFinance,
  highApprovalRequired,
  packageStatus,
  hasInFlightRequest,
  hasHighApprover,
  pending,
  onFlip,
}: ApprovalPolicyPanelProps) => {
  const isUpdatablePackageStatus =
    packageStatus === "draft" || packageStatus === "active";
  const blockedReason = !isUpdatablePackageStatus
    ? "Policy can only change while the package is in Draft or Active."
    : hasInFlightRequest
      ? "A payment request is in flight. The policy is locked until that request reaches a final state."
      : null;
  const canFlip = isFinance && !blockedReason;
  return (
    <section className="work-package-view__aside-panel">
      <h2>Approval policy</h2>
      <StatusPill tone={highApprovalRequired ? "warning" : "neutral"}>
        {highApprovalRequired
          ? "Director approval required"
          : "Default policy (PM approval)"}
      </StatusPill>
      <p className="work-package-view__aside-note">
        {highApprovalRequired
          ? "Finance can only release after both PM and Director approve this request."
          : "PM approval is enough for Finance to release."}
      </p>
      {highApprovalRequired && !hasHighApprover && (
        <p className="work-package-view__aside-note work-package-view__aside-note--warning">
          Required high approval is on, but no Director is assigned. Finance
          must assign one before release can complete.
        </p>
      )}
      {isFinance && (
        <>
          {blockedReason && (
            <p className="work-package-view__aside-note">{blockedReason}</p>
          )}
          <button
            type="button"
            className="work-package-view__btn work-package-view__btn--ghost"
            onClick={() => onFlip(!highApprovalRequired)}
            disabled={pending || !canFlip}
          >
            {highApprovalRequired
              ? "Switch to default (PM only)"
              : "Require Director approval"}
          </button>
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
      setAssignWalletError("Invalid team member address");
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
                Team member address
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
                placeholder="Team member account address"
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
  documentRequests: Array<[string, DocumentRequestMetadata]>;
  project: PublicKey;
  workPackage: PublicKey;
  pending: boolean;
  onAct: (op: () => Promise<{ signature: string }>) => Promise<void>;
  onMetadataChange: (message: string) => void;
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
  documentRequests,
  project,
  workPackage,
  pending,
  onAct,
  onMetadataChange,
  client,
  metadataWriter,
}: DocumentPanelProps) => {
  const [docText, setDocText] = useState("");
  const [requestText, setRequestText] = useState("");

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
  const canRequestDocument =
    (role === "projectManager" || role === "financeDirector") &&
    activeRequest != null &&
    activeRequestAddress != null &&
    !isTerminal &&
    metadataWriter !== null;
  const outstandingDocumentRequests = documentRequests.filter(
    ([, request]) =>
      request.status === "requested" &&
      (!activeRequestAddress ||
        request.paymentRequest === activeRequestAddress.toBase58()),
  );

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
      const requestToFulfill = outstandingDocumentRequests[0];
      if (requestToFulfill) {
        const [ref, request] = requestToFulfill;
        metadataWriter?.putDocumentRequest(ref, {
          ...request,
          status: "fulfilled",
          fulfilledDocumentRef: docRef,
          fulfilledAt: uploadedAt,
        });
      }
      return result;
    }).then(() => {
      setDocText("");
    });
  };

  const onRequestDocument = () => {
    if (!metadataWriter || !activeRequestAddress || !activeRequest) return;
    const note = requestText.trim();
    if (!note) return;
    const requestedAt = new Date().toISOString();
    const ref = documentRequestMetadataRef(workPackage, requestedAt);
    metadataWriter.putDocumentRequest(ref, {
      workPackage: workPackage.toBase58(),
      paymentRequest: activeRequestAddress.toBase58(),
      milestone: activeRequest.hasMilestone
        ? activeRequest.milestone.toBase58()
        : undefined,
      status: "requested",
      requestedByDisplayName:
        walletDisplayName ?? shortAddress(wallet.toBase58()),
      requestedByRole: role,
      requestedAt,
      note,
    });
    setRequestText("");
    onMetadataChange("Document request recorded.");
  };

  return (
    <>
      {documentRequests.some(
        ([, request]) => request.status === "requested",
      ) && (
        <section className="work-package-view__document-requests">
          <h3>Document requests</h3>
          <ul className="work-package-view__documents">
            {documentRequests.map(([ref, request]) => (
              <li key={ref} className="work-package-view__document">
                <div className="work-package-view__document-icon">
                  {request.status === "fulfilled" ? "OK" : "REQ"}
                </div>
                <div className="work-package-view__document-body">
                  <p className="work-package-view__document-name">
                    {request.note}
                  </p>
                  <p className="work-package-view__document-meta">
                    {request.status === "fulfilled" ? "Fulfilled" : "Requested"}{" "}
                    · {request.requestedByDisplayName} ·{" "}
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {canRequestDocument && (
        <div className="work-package-view__add-doc-form">
          <label className="work-package-view__reject-label">
            Request evidence / document
          </label>
          <textarea
            className="work-package-view__reject-input"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            rows={3}
            placeholder="What should the contractor upload before review?"
            disabled={pending}
          />
          <div className="work-package-view__reject-actions">
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--ghost"
              onClick={() => setRequestText("")}
              disabled={pending}
            >
              Clear
            </button>
            <button
              type="button"
              className="work-package-view__btn work-package-view__btn--primary"
              onClick={onRequestDocument}
              disabled={pending || requestText.trim().length === 0}
            >
              Request document
            </button>
          </div>
        </div>
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
          {outstandingDocumentRequests.length > 0 && (
            <p className="work-package-view__aside-note">
              Uploading will fulfill the oldest outstanding document request.
            </p>
          )}
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

// `DemoRole` is a structural subset of `TeamRole`, so its values can be
// assigned directly to TeamRole fields without conversion.

interface WithdrawalPanelProps {
  rows: RequestRow[];
  clearances: Array<[string, WithdrawalClearanceMetadata]>;
  role: DemoRole;
  wallet: PublicKey;
  walletDisplayName: string | null;
  packageContractor: PublicKey;
  workPackage: PublicKey;
  metadataWriter: MetadataWriter | null;
  pending: boolean;
  onMetadataChange: (message: string) => void;
}

const WithdrawalPanel = ({
  rows,
  clearances,
  role,
  wallet,
  walletDisplayName,
  packageContractor,
  workPackage,
  metadataWriter,
  pending,
  onMetadataChange,
}: WithdrawalPanelProps) => {
  const clearedByRequest = new Set(
    clearances.map(([, clearance]) => clearance.paymentRequest),
  );
  const releasedRows = rows.filter(
    (row) =>
      row.request.account.status === "released" &&
      row.request.account.releasedAmount > 0n,
  );
  const availableRows = releasedRows.filter(
    (row) => !clearedByRequest.has(row.request.address.toBase58()),
  );
  const clearedRows = releasedRows.filter((row) =>
    clearedByRequest.has(row.request.address.toBase58()),
  );
  const available = availableRows.reduce(
    (sum, row) => sum + row.request.account.releasedAmount,
    0n,
  );
  const canClear =
    role === "contractor" &&
    wallet.equals(packageContractor) &&
    metadataWriter !== null;

  const onClear = (row: RequestRow) => {
    if (!metadataWriter) return;
    const clearedAt = new Date().toISOString();
    const paymentRequest = row.request.address;
    metadataWriter.putWithdrawalClearance(
      withdrawalClearanceMetadataRef(paymentRequest),
      {
        workPackage: workPackage.toBase58(),
        paymentRequest: paymentRequest.toBase58(),
        amount: row.request.account.releasedAmount,
        clearedByDisplayName:
          walletDisplayName ?? shortAddress(wallet.toBase58()),
        clearedByRole: role,
        clearedAt,
      },
    );
    onMetadataChange("Withdrawal marked as cleared.");
  };

  if (releasedRows.length === 0) {
    return (
      <p className="work-package-view__empty">
        No released payments are available on this package yet.
      </p>
    );
  }

  return (
    <div className="work-package-view__withdrawal">
      <dl className="work-package-view__metrics">
        <Metric label="Available">
          <Money amount={available} withSymbol />
        </Metric>
        <Metric label="Cleared">{clearedRows.length.toString()}</Metric>
      </dl>
      {availableRows.length === 0 ? (
        <p className="work-package-view__empty">
          All released payments on this package have been marked withdrawn.
        </p>
      ) : (
        <ul className="work-package-view__documents">
          {availableRows.map((row) => (
            <li
              key={row.request.address.toBase58()}
              className="work-package-view__document"
            >
              <div className="work-package-view__document-icon">PAY</div>
              <div className="work-package-view__document-body">
                <p className="work-package-view__document-name">
                  Request #{row.request.account.requestId.toString()}
                </p>
                <p className="work-package-view__document-meta">
                  Released {formatTimestamp(row.request.account.updatedAt)} ·{" "}
                  <Money
                    amount={row.request.account.releasedAmount}
                    withSymbol
                  />
                </p>
              </div>
              {canClear && (
                <button
                  type="button"
                  className="work-package-view__btn work-package-view__btn--ghost"
                  onClick={() => onClear(row)}
                  disabled={pending}
                >
                  Mark withdrawn
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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
  const [releaseOpen, setReleaseOpen] = useState(false);

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
  const requestLabel = activeRequest
    ? `Request #${activeRequest.request.account.requestId.toString()}`
    : null;
  const targetLabel = activeRequest?.milestone
    ? `Milestone ${activeRequest.milestone.account.milestoneId.toString()}`
    : isMilestonePackage
      ? "milestone payment"
      : "package payment";
  const actionCopy = (() => {
    if (canPmApprove && requestLabel) {
      return {
        title: "Review submitted evidence",
        body: `${requestLabel} is waiting for PM approval against ${targetLabel}.`,
      };
    }
    if (canHighApprove && requestLabel) {
      return {
        title: "Director approval required",
        body: `${requestLabel} has PM approval and needs the Director approval step before release.`,
      };
    }
    if (canRelease && requestLabel) {
      return {
        title: "Release-ready payment",
        body: `${requestLabel} has approval and can be checked for release.`,
      };
    }
    if (canRemoveHold && requestLabel) {
      return {
        title: "Payment on hold",
        body: `${requestLabel} is held. Remove the hold when the issue is resolved.`,
      };
    }
    if (canPlaceHold && requestLabel) {
      return {
        title: "Review chain state",
        body: `${requestLabel} is in progress. Finance can place a hold if release should pause.`,
      };
    }
    if (canSubmitInvoice) {
      return {
        title: "Prepare payment request",
        body: isMilestonePackage
          ? "Select an available milestone, add evidence, and submit the invoice for PM review."
          : "Add evidence and submit an invoice against this package for PM review.",
      };
    }
    if (activeRequest && requestLabel) {
      return {
        title: "Track payment request",
        body: `${requestLabel} is currently ${paymentRequestStatusLabel(
          status ?? "submitted",
        ).toLowerCase()}.`,
      };
    }
    return {
      title: "No blocking action",
      body:
        role === "financeDirector"
          ? "This package is up to date for Finance."
          : role === "projectManager"
            ? "This package is up to date for the Project Manager."
            : role === "contractor" && !contractorIsSelf
              ? "Read-only: this package is assigned to another contractor."
              : "This package is up to date for your current role.",
    };
  })();

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
    ).then(() => setReleaseOpen(false));
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
      <h2>Package Actions</h2>
      <p className="work-package-view__aside-eyebrow">{eyebrow}</p>
      <div className="work-package-view__action-summary">
        <h3>{actionCopy.title}</h3>
        <p>{actionCopy.body}</p>
      </div>

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
              Submit invoice
            </button>
          ) : (
            <div className="work-package-view__action-modal-overlay">
              <div
                className="work-package-view__reject-form work-package-view__action-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Submit invoice"
              >
                <div className="work-package-view__action-modal-head">
                  <h3>Submit invoice</h3>
                  <p>
                    Link this payment request to the right release rule before
                    PM review.
                  </p>
                </div>
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
                          a.account.milestoneId < b.account.milestoneId
                            ? -1
                            : 1,
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
            Approve request
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
            Approve director step
          </button>
        </div>
      )}

      {canRelease && (
        <div className="work-package-view__action-buttons">
          <button
            type="button"
            className="work-package-view__btn work-package-view__btn--primary"
            onClick={() => setReleaseOpen(true)}
            disabled={pending}
          >
            Release funds
          </button>
        </div>
      )}

      {releaseOpen && activeRequest && (
        <div className="work-package-view__action-modal-overlay">
          <div
            className="work-package-view__reject-form work-package-view__action-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Release funds"
          >
            <div className="work-package-view__action-modal-head">
              <h3>Release funds</h3>
              <p>
                Confirm release of{" "}
                <Money
                  amount={activeRequest.request.account.amount}
                  withSymbol
                />{" "}
                from escrow to the assigned contractor.
              </p>
            </div>
            <div className="work-package-view__reject-actions">
              <button
                type="button"
                className="work-package-view__btn work-package-view__btn--ghost"
                onClick={() => setReleaseOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="work-package-view__btn work-package-view__btn--primary"
                onClick={onRelease}
                disabled={pending}
              >
                Confirm release
              </button>
            </div>
          </div>
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
              Place hold
            </button>
          ) : (
            <div className="work-package-view__action-modal-overlay">
              <div
                className="work-package-view__reject-form work-package-view__action-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Place hold"
              >
                <div className="work-package-view__action-modal-head">
                  <h3>Place hold</h3>
                  <p>
                    Record why Finance is pausing this payment request before
                    release.
                  </p>
                </div>
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
              Reject
            </button>
          ) : (
            <div className="work-package-view__action-modal-overlay">
              <div
                className="work-package-view__reject-form work-package-view__action-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Reject request"
              >
                <div className="work-package-view__action-modal-head">
                  <h3>Reject request</h3>
                  <p>
                    Leave an approval note so the contractor can see what needs
                    to change.
                  </p>
                </div>
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
