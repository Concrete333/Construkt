import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
import { walletForRole } from "../lib/clients";
import { formatTimestamp, parseMockUsdc, shortAddress } from "../lib/format";
import { nextWorkPackageId, packageScopeMetadataRef } from "../lib/ids";
import { friendlyClientError } from "../lib/program";
import type { TxResult } from "../lib/program";
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
import type { DemoRole } from "../lib/theme";
import "./ProjectDetailPage.css";

interface ActionFeedback {
  kind: "success" | "error";
  message: string;
}

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
  role: DemoRole;
}

interface FundCtx {
  isFinance: boolean;
  fundTarget: string | null;
  fundText: string;
  fundError: string | null;
  pending: boolean;
  onOpenFund: (packageAddress: string) => void;
  onChangeFundText: (v: string) => void;
  onCancelFund: () => void;
  onSubmitFund: (packageAddress: PublicKey, projectAddress: PublicKey) => void;
}

const tryDecode = (address?: string): PublicKey | null => {
  if (!address) return null;
  try {
    return new PublicKey(address);
  } catch {
    return null;
  }
};

export const ProjectDetailPage = ({
  address,
  role,
}: ProjectDetailPageProps) => {
  const { client, metadata, metadataWriter, world } = useClients();
  const projectKey = useMemo(() => tryDecode(address), [address]);
  const [loaded, setLoaded] = useState<LoadedDetail | null | "missing">(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  const [addPkgOpen, setAddPkgOpen] = useState(false);
  const [scopeText, setScopeText] = useState("");
  const [capText, setCapText] = useState("");
  const [capError, setCapError] = useState<string | null>(null);
  const [contractorText, setContractorText] = useState(
    world.contractor.publicKey.toBase58(),
  );
  const [contractorError, setContractorError] = useState<string | null>(null);

  const [fundTarget, setFundTarget] = useState<string | null>(null);
  const [fundText, setFundText] = useState("");
  const [fundError, setFundError] = useState<string | null>(null);

  const wallet = walletForRole(world, role);

  const onAct = async (op: () => Promise<TxResult>) => {
    setPending(true);
    setFeedback(null);
    try {
      const result = await op();
      setFeedback({
        kind: "success",
        message: `Submitted · ${shortAddress(result.signature, { head: 6, tail: 6 })}`,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({ kind: "error", message: friendlyClientError(err) });
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (!projectKey) return;
    let cancelled = false;
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
  }, [client, metadata, projectKey, refreshKey]);

  const onAddPackageSubmit = () => {
    if (!projectKey) return;
    const scope = scopeText.trim();
    if (!scope) return;

    let capAmount: bigint;
    try {
      capAmount = parseMockUsdc(capText);
    } catch (e) {
      setCapError(e instanceof Error ? e.message : "Invalid amount");
      return;
    }
    setCapError(null);

    let contractorKey: PublicKey;
    try {
      contractorKey = new PublicKey(contractorText.trim());
    } catch {
      setContractorError("Invalid wallet address");
      return;
    }
    setContractorError(null);

    const packages =
      loaded !== null && loaded !== "missing" ? loaded.packages : [];
    const packageId = nextWorkPackageId(
      packages.map((row) => ({
        address: row.rollup.address,
        account: row.rollup.package,
      })),
    );
    const scopeRef = packageScopeMetadataRef(projectKey, packageId);
    metadataWriter?.putPackageScope(scopeRef, {
      description: scope,
      contractorDisplayName: "Demo Contractor",
      contractModel: "bespoke",
    });
    void onAct(() =>
      client.createWorkPackage({
        authority: wallet,
        project: projectKey,
        packageId,
        capAmount,
        contractor: contractorKey,
        mint: world.mint,
        scopeRef,
      }),
    ).then(() => {
      setAddPkgOpen(false);
      setScopeText("");
      setCapText("");
      setContractorText(world.contractor.publicKey.toBase58());
    });
  };

  const onSubmitFund = (
    packageAddress: PublicKey,
    projectAddress: PublicKey,
  ) => {
    let amount: bigint;
    try {
      amount = parseMockUsdc(fundText);
    } catch (e) {
      setFundError(e instanceof Error ? e.message : "Invalid amount");
      return;
    }
    setFundError(null);
    void onAct(() =>
      client.fundEscrow({
        authority: wallet,
        project: projectAddress,
        workPackage: packageAddress,
        amount,
      }),
    ).then(() => {
      setFundTarget(null);
      setFundText("");
    });
  };

  const fundCtx: FundCtx = {
    isFinance: role === "financeDirector",
    fundTarget,
    fundText,
    fundError,
    pending,
    onOpenFund: (addr) => {
      setFundTarget(addr);
      setFundText("");
      setFundError(null);
    },
    onChangeFundText: (v) => {
      setFundText(v);
      setFundError(null);
    },
    onCancelFund: () => {
      setFundTarget(null);
      setFundText("");
      setFundError(null);
    },
    onSubmitFund,
  };

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
  const canAddPackage = role === "financeDirector" || role === "projectManager";

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
          <div className="project-detail__section-head-row">
            <h2 className="project-detail__section-heading">Work packages</h2>
            {canAddPackage && (
              <button
                type="button"
                className="project-detail__btn project-detail__btn--primary"
                onClick={() => setAddPkgOpen((v) => !v)}
                disabled={pending}
              >
                + Add package
              </button>
            )}
          </div>

          {addPkgOpen && (
            <div className="project-detail__create-form">
              <div className="project-detail__form-field">
                <label className="project-detail__form-label">
                  Scope description
                </label>
                <input
                  className="project-detail__form-input"
                  type="text"
                  value={scopeText}
                  onChange={(e) => setScopeText(e.target.value)}
                  placeholder="What work is covered?"
                  disabled={pending}
                />
              </div>
              <div className="project-detail__form-field">
                <label className="project-detail__form-label">Cap amount</label>
                <input
                  className="project-detail__form-input"
                  type="text"
                  value={capText}
                  onChange={(e) => {
                    setCapText(e.target.value);
                    setCapError(null);
                  }}
                  placeholder="e.g. 50000"
                  disabled={pending}
                />
                {capError && (
                  <p className="project-detail__form-error">{capError}</p>
                )}
              </div>
              <div className="project-detail__form-field">
                <label className="project-detail__form-label">
                  Contractor wallet
                </label>
                <input
                  className="project-detail__form-input"
                  type="text"
                  value={contractorText}
                  onChange={(e) => {
                    setContractorText(e.target.value);
                    setContractorError(null);
                  }}
                  placeholder="base58 public key"
                  disabled={pending}
                />
                {contractorError && (
                  <p className="project-detail__form-error">
                    {contractorError}
                  </p>
                )}
              </div>
              <div className="project-detail__create-actions">
                <button
                  type="button"
                  className="project-detail__btn project-detail__btn--ghost"
                  onClick={() => {
                    setAddPkgOpen(false);
                    setScopeText("");
                    setCapText("");
                    setCapError(null);
                    setContractorText(world.contractor.publicKey.toBase58());
                    setContractorError(null);
                  }}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="project-detail__btn project-detail__btn--primary"
                  onClick={onAddPackageSubmit}
                  disabled={
                    pending ||
                    scopeText.trim().length === 0 ||
                    capText.trim().length === 0
                  }
                >
                  Create package
                </button>
              </div>
            </div>
          )}

          {feedback && (
            <p
              className={`project-detail__feedback project-detail__feedback--${feedback.kind}`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          )}

          <ul className="project-detail__packages">
            {packages.map((row) => (
              <PackageCard
                key={row.rollup.address.toBase58()}
                row={row}
                projectAddress={projectKey}
                fundCtx={fundCtx}
              />
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

const PackageCard = ({
  row,
  projectAddress,
  fundCtx,
}: {
  row: PackageRow;
  projectAddress: PublicKey;
  fundCtx: FundCtx;
}) => {
  const wpHref = buildHash("workPackageView", {
    address: row.rollup.address.toBase58(),
  });
  const status: WorkPackageAccount["status"] = row.rollup.package.status;
  const requestStatus = row.activeRequest
    ? paymentRequestDisplayStatus(row.activeRequest)
    : null;
  const packageAddr = row.rollup.address.toBase58();
  const isFundTarget = fundCtx.fundTarget === packageAddr;
  const canFund =
    fundCtx.isFinance &&
    status === "active" &&
    row.rollup.package.fundedAmount < row.rollup.package.capAmount;

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

      {canFund && (
        <div className="project-detail__package-fund">
          {!isFundTarget ? (
            <button
              type="button"
              className="project-detail__btn project-detail__btn--ghost"
              onClick={(e) => {
                e.preventDefault();
                fundCtx.onOpenFund(packageAddr);
              }}
              disabled={fundCtx.pending}
            >
              Fund…
            </button>
          ) : (
            <div
              className="project-detail__create-form"
              onClick={(e) => e.preventDefault()}
            >
              <div className="project-detail__form-field">
                <label className="project-detail__form-label">Amount</label>
                <input
                  className="project-detail__form-input"
                  type="text"
                  value={fundCtx.fundText}
                  onChange={(e) => fundCtx.onChangeFundText(e.target.value)}
                  placeholder="e.g. 10000"
                  disabled={fundCtx.pending}
                />
                {fundCtx.fundError && (
                  <p className="project-detail__form-error">
                    {fundCtx.fundError}
                  </p>
                )}
              </div>
              <div className="project-detail__create-actions">
                <button
                  type="button"
                  className="project-detail__btn project-detail__btn--ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    fundCtx.onCancelFund();
                  }}
                  disabled={fundCtx.pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="project-detail__btn project-detail__btn--primary"
                  onClick={(e) => {
                    e.preventDefault();
                    fundCtx.onSubmitFund(row.rollup.address, projectAddress);
                  }}
                  disabled={
                    fundCtx.pending || fundCtx.fundText.trim().length === 0
                  }
                >
                  Fund
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
};
