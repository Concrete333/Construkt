import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
import { walletForRole } from "../lib/clients";
import { formatTimestamp, parseMockUsdc, shortAddress } from "../lib/format";
import { nextWorkPackageId, packageScopeMetadataRef } from "../lib/ids";
import { CONSTRUKT_PROGRAM_ID } from "../lib/config";
import { deriveWorkPackageAddress } from "../lib/pda";
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
  isPaymentRequestActive,
} from "../selectors/paymentSelectors";
import type {
  PackageRollup,
  ProjectRollup,
} from "../selectors/projectSelectors";
import type { AuditEvent } from "../selectors/auditSelectors";
import type {
  ApprovalRecord,
  Fetched,
  MilestoneAccount,
  PaymentRequestAccount,
  ProjectAccount,
  ProjectDrafterAccount,
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
  milestones: Fetched<MilestoneAccount>[];
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
  projectDrafters: Fetched<ProjectDrafterAccount>[];
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
  onActivatePackage: (
    packageAddress: PublicKey,
    projectAddress: PublicKey,
  ) => void;
  onOpenFund: (packageAddress: string) => void;
  onChangeFundText: (v: string) => void;
  onCancelFund: () => void;
  onSubmitFund: (packageAddress: PublicKey, projectAddress: PublicKey) => void;
}

interface MilestoneFormRow {
  name: string;
  amountText: string;
  startDate: string;
  endDate: string;
}

interface ParsedMilestoneFormRow {
  name: string;
  amount: bigint;
  startAt: bigint;
  endAt: bigint;
  targetDate: string;
}

const defaultMilestoneRows = (): MilestoneFormRow[] => [
  { name: "Milestone 1", amountText: "", startDate: "", endDate: "" },
  { name: "Milestone 2", amountText: "", startDate: "", endDate: "" },
];

const nextDefaultMilestoneName = (rows: MilestoneFormRow[]): string => {
  const used = new Set(
    rows
      .map((row) => /^Milestone (\d+)$/.exec(row.name.trim())?.[1])
      .filter((value): value is string => value !== undefined)
      .map((value) => Number.parseInt(value, 10)),
  );
  let next = 1;
  while (used.has(next)) next += 1;
  return `Milestone ${next}`;
};

const tryDecode = (address?: string): PublicKey | null => {
  if (!address) return null;
  try {
    return new PublicKey(address);
  } catch {
    return null;
  }
};

const dateToUnixSeconds = (value: string): bigint | null => {
  const millis = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(millis)) return null;
  return BigInt(Math.floor(millis / 1000));
};

const parseMilestoneRows = (
  rows: MilestoneFormRow[],
  capAmount: bigint,
): ParsedMilestoneFormRow[] | string => {
  const filled = rows.filter(
    (row) =>
      row.name.trim() ||
      row.amountText.trim() ||
      row.startDate.trim() ||
      row.endDate.trim(),
  );
  if (filled.length === 0) return "Add at least one milestone.";

  const parsed: ParsedMilestoneFormRow[] = [];
  for (const [idx, row] of filled.entries()) {
    const label = row.name.trim() || `Milestone ${idx + 1}`;
    if (!row.amountText.trim()) return `${label} needs an amount.`;
    if (!row.startDate || !row.endDate)
      return `${label} needs both a start date and an end date.`;

    let amount: bigint;
    try {
      amount = parseMockUsdc(row.amountText);
    } catch (e) {
      return e instanceof Error ? e.message : `${label} has an invalid amount.`;
    }
    if (amount <= 0n) return `${label} amount must be greater than zero.`;

    const startAt = dateToUnixSeconds(row.startDate);
    const endAt = dateToUnixSeconds(row.endDate);
    if (startAt === null || endAt === null)
      return `${label} has invalid dates.`;
    if (startAt >= endAt) return `${label} end date must be after start date.`;

    parsed.push({
      name: label,
      amount,
      startAt,
      endAt,
      targetDate: row.endDate,
    });
  }

  const total = parsed.reduce((sum, row) => sum + row.amount, 0n);
  if (total !== capAmount) {
    return "Milestone amounts must add up exactly to the package cap.";
  }

  const byStart = [...parsed].sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
  for (let i = 1; i < byStart.length; i += 1) {
    if (byStart[i].startAt < byStart[i - 1].endAt) {
      return "Milestone date ranges cannot overlap.";
    }
  }

  return parsed;
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
  const [packageMode, setPackageMode] = useState<"simple" | "milestone">(
    "simple",
  );
  const [highApprovalRequired, setHighApprovalRequired] = useState(false);
  const [milestoneRows, setMilestoneRows] = useState<MilestoneFormRow[]>(() =>
    defaultMilestoneRows(),
  );
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

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
        message: `Submitted · ${shortAddress(result.signature, {
          head: 6,
          tail: 6,
        })}`,
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
      const projectDrafters =
        await client.fetchProjectDraftersForProject(projectKey);
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

        const milestones = await client.fetchMilestonesForPackage(pkg.address);
        const activeFetchedRequests = [...reqs]
          .filter((r) => isPaymentRequestActive(r.account))
          .sort((a, b) => (a.account.requestId < b.account.requestId ? 1 : -1));
        const activeFetchedRequest =
          activeFetchedRequests.find((request) => request.account.holdActive) ??
          (pkg.account.hasActiveRequest
            ? (reqs.find((request) =>
                request.address.equals(pkg.account.activeRequest),
              ) ?? null)
            : (activeFetchedRequests[0] ?? null));
        const activeRequest = activeFetchedRequest?.account ?? null;
        const scope = await metadata.resolvePackageScope(pkg.account.scopeRef);
        packageRows.push({
          rollup: selectPackageRollup(
            pkg,
            activeRequest,
            activeFetchedRequest?.address ?? null,
          ),
          scope,
          milestones,
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
          projectDrafters,
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
    if (capAmount <= 0n) {
      setCapError("Cap amount must be greater than zero.");
      return;
    }
    setCapError(null);

    const parsedMilestones =
      packageMode === "milestone"
        ? parseMilestoneRows(milestoneRows, capAmount)
        : [];
    if (packageMode === "milestone" && typeof parsedMilestones === "string") {
      setMilestoneError(parsedMilestones);
      return;
    }
    setMilestoneError(null);

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
    const packageScopeMetadata: PackageScopeMetadata = {
      description: scope,
      contractorDisplayName: "Demo Contractor",
      contractModel: packageMode === "milestone" ? "milestone" : "bespoke",
      internalMilestones:
        packageMode === "milestone"
          ? (parsedMilestones as ParsedMilestoneFormRow[]).map(
              (milestone, idx) => ({
                id: String(idx + 1),
                name: milestone.name,
                targetDate: milestone.targetDate,
                amount: milestone.amount,
                status: "uninvoiced" as const,
              }),
            )
          : undefined,
    };
    void onAct(async () => {
      if (packageMode === "milestone") {
        const workPackage = deriveWorkPackageAddress(
          CONSTRUKT_PROGRAM_ID,
          projectKey,
          packageId,
        );
        const result =
          role === "financeDirector"
            ? await client.createWorkPackage({
                authority: wallet,
                project: projectKey,
                packageId,
                capAmount,
                contractor: contractorKey,
                mint: rollup.project.mint,
                scopeRef,
                highApprovalRequired,
              })
            : await client.createPackageDraft({
                drafter: wallet,
                project: projectKey,
                packageId,
                capAmount,
                contractor: contractorKey,
                scopeRef,
                highApprovalRequired,
              });
        for (const [idx, milestone] of (
          parsedMilestones as ParsedMilestoneFormRow[]
        ).entries()) {
          const milestoneId = BigInt(idx + 1);
          if (role === "financeDirector") {
            await client.createMilestone({
              authority: wallet,
              project: projectKey,
              workPackage,
              milestoneId,
              amount: milestone.amount,
              startAt: milestone.startAt,
              endAt: milestone.endAt,
              metadataRef: `${scopeRef}/milestone/${milestoneId}`,
            });
          } else {
            await client.createDraftMilestone({
              drafter: wallet,
              project: projectKey,
              workPackage,
              milestoneId,
              amount: milestone.amount,
              startAt: milestone.startAt,
              endAt: milestone.endAt,
              metadataRef: `${scopeRef}/milestone/${milestoneId}`,
            });
          }
        }
        metadataWriter?.putPackageScope(scopeRef, packageScopeMetadata);
        return result;
      }
      if (role === "financeDirector") {
        const result = await client.createWorkPackage({
          authority: wallet,
          project: projectKey,
          packageId,
          capAmount,
          contractor: contractorKey,
          mint: rollup.project.mint,
          scopeRef,
          highApprovalRequired,
        });
        metadataWriter?.putPackageScope(scopeRef, packageScopeMetadata);
        return result;
      }
      const result = await client.createPackageDraft({
        drafter: wallet,
        project: projectKey,
        packageId,
        capAmount,
        contractor: contractorKey,
        scopeRef,
        highApprovalRequired,
      });
      metadataWriter?.putPackageScope(scopeRef, packageScopeMetadata);
      return result;
    }).then(() => {
      setAddPkgOpen(false);
      setScopeText("");
      setCapText("");
      setContractorText(world.contractor.publicKey.toBase58());
      setPackageMode("simple");
      setMilestoneRows(defaultMilestoneRows());
      setMilestoneError(null);
      setHighApprovalRequired(false);
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

  const onActivatePackage = (
    packageAddress: PublicKey,
    projectAddress: PublicKey,
  ) => {
    void onAct(() =>
      client.activateWorkPackage({
        authority: wallet,
        project: projectAddress,
        workPackage: packageAddress,
      }),
    );
  };

  const onAuthorizePmDrafter = (
    existing: Fetched<ProjectDrafterAccount> | null,
  ) => {
    if (!projectKey) return;
    void onAct(() =>
      existing
        ? client.setProjectDrafterActive({
            authority: wallet,
            project: projectKey,
            projectDrafter: existing.address,
            active: true,
          })
        : client.assignProjectDrafter({
            authority: wallet,
            project: projectKey,
            wallet: world.pm.publicKey,
          }),
    );
  };

  const fundCtx: FundCtx = {
    isFinance: role === "financeDirector",
    fundTarget,
    fundText,
    fundError,
    pending,
    onActivatePackage,
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

  const {
    rollup,
    metadata: meta,
    packages,
    projectDrafters,
    timeline,
  } = loaded;
  const canAddPackage = role === "financeDirector" || role === "projectManager";
  const pmDrafter =
    projectDrafters.find((row) =>
      row.account.wallet.equals(world.pm.publicKey),
    ) ?? null;
  const canAuthorizePmDrafter =
    role === "financeDirector" && (!pmDrafter || !pmDrafter.account.active);

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
          <Metric label="Budget">
            <Money amount={rollup.projectBudget} withSymbol />
          </Metric>
          <Metric label="Allocated">
            <Money amount={rollup.allocatedPackageBudget} withSymbol />
          </Metric>
          <Metric label="Remaining">
            <Money amount={rollup.remainingAllocatableBudget} withSymbol />
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
        {canAuthorizePmDrafter && (
          <button
            type="button"
            className="project-detail__btn project-detail__btn--ghost"
            onClick={() => onAuthorizePmDrafter(pmDrafter)}
            disabled={pending}
          >
            {pmDrafter ? "Reactivate PM" : "Authorize PM"}
          </button>
        )}
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
              <div className="project-detail__form-field">
                <label className="project-detail__form-label">
                  Payment mode
                </label>
                <select
                  className="project-detail__form-input"
                  value={packageMode}
                  onChange={(e) => {
                    setPackageMode(
                      e.target.value === "milestone" ? "milestone" : "simple",
                    );
                    setMilestoneError(null);
                  }}
                  disabled={pending}
                >
                  <option value="simple">Package level</option>
                  <option value="milestone">Milestone schedule</option>
                </select>
              </div>
              <div className="project-detail__form-field project-detail__form-field--checkbox">
                <label className="project-detail__form-checkbox">
                  <input
                    type="checkbox"
                    checked={highApprovalRequired}
                    onChange={(e) => setHighApprovalRequired(e.target.checked)}
                    disabled={pending}
                  />
                  <span>
                    Require Director (high) approval before Finance can release
                  </span>
                </label>
                <p className="project-detail__form-hint">
                  When on, Finance can only release after both PM and Director
                  approve. Default packages release after PM approval alone.
                </p>
              </div>
              {packageMode === "milestone" && (
                <div className="project-detail__milestone-editor">
                  <div className="project-detail__milestone-head">
                    <span>Milestones</span>
                    <button
                      type="button"
                      className="project-detail__btn project-detail__btn--ghost"
                      onClick={() =>
                        setMilestoneRows((rows) => [
                          ...rows,
                          {
                            name: nextDefaultMilestoneName(rows),
                            amountText: "",
                            startDate: "",
                            endDate: "",
                          },
                        ])
                      }
                      disabled={pending}
                    >
                      Add row
                    </button>
                  </div>
                  {milestoneRows.map((row, idx) => (
                    <div
                      className="project-detail__milestone-row"
                      key={`milestone-${idx}`}
                    >
                      <input
                        className="project-detail__form-input"
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          setMilestoneRows((rows) =>
                            rows.map((item, i) =>
                              i === idx
                                ? { ...item, name: e.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Milestone name"
                        disabled={pending}
                      />
                      <input
                        className="project-detail__form-input"
                        type="text"
                        value={row.amountText}
                        onChange={(e) => {
                          setMilestoneRows((rows) =>
                            rows.map((item, i) =>
                              i === idx
                                ? { ...item, amountText: e.target.value }
                                : item,
                            ),
                          );
                          setMilestoneError(null);
                        }}
                        placeholder="Amount"
                        disabled={pending}
                      />
                      <input
                        className="project-detail__form-input"
                        type="date"
                        value={row.startDate}
                        onChange={(e) => {
                          setMilestoneRows((rows) =>
                            rows.map((item, i) =>
                              i === idx
                                ? { ...item, startDate: e.target.value }
                                : item,
                            ),
                          );
                          setMilestoneError(null);
                        }}
                        disabled={pending}
                      />
                      <input
                        className="project-detail__form-input"
                        type="date"
                        value={row.endDate}
                        onChange={(e) => {
                          setMilestoneRows((rows) =>
                            rows.map((item, i) =>
                              i === idx
                                ? { ...item, endDate: e.target.value }
                                : item,
                            ),
                          );
                          setMilestoneError(null);
                        }}
                        disabled={pending}
                      />
                      <button
                        type="button"
                        className="project-detail__btn project-detail__btn--ghost"
                        onClick={() =>
                          setMilestoneRows((rows) =>
                            rows.filter((_item, i) => i !== idx),
                          )
                        }
                        disabled={pending || milestoneRows.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {milestoneError && (
                    <p className="project-detail__form-error">
                      {milestoneError}
                    </p>
                  )}
                </div>
              )}
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
                    setPackageMode("simple");
                    setMilestoneRows(defaultMilestoneRows());
                    setMilestoneError(null);
                    setHighApprovalRequired(false);
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
                  {role === "financeDirector"
                    ? "Create package"
                    : "Submit draft"}
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
  const isMilestoneMode = row.rollup.package.milestoneCounter > 0n;
  const milestoneTotal = row.milestones.reduce(
    (sum, milestone) => sum + milestone.account.amount,
    0n,
  );
  const milestoneScheduleComplete =
    !isMilestoneMode || milestoneTotal === row.rollup.package.capAmount;
  const canFund =
    fundCtx.isFinance &&
    status === "active" &&
    row.rollup.package.fundedAmount < row.rollup.package.capAmount &&
    milestoneScheduleComplete;

  return (
    <li className="project-detail__package">
      <a className="project-detail__package-link" href={wpHref}>
        <header className="project-detail__package-head">
          <h3>
            {row.scope?.description?.split(".")[0] ??
              row.rollup.package.scopeRef}
          </h3>
          <div className="project-detail__package-pills">
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
            {row.rollup.package.highApprovalRequired && (
              <StatusPill tone="warning">High approval required</StatusPill>
            )}
          </div>
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
        {isMilestoneMode && (
          <div className="project-detail__package-milestones">
            <span>{row.milestones.length} milestones</span>
            <span>
              <Money amount={milestoneTotal} withSymbol /> scheduled
            </span>
          </div>
        )}
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

      {fundCtx.isFinance && status === "draft" && milestoneScheduleComplete && (
        <div className="project-detail__package-fund">
          <p className="project-detail__package-note">
            {row.rollup.package.highApprovalRequired
              ? "Releases require both PM and Director approval."
              : "Releases unlock after PM approval (default policy)."}
          </p>
          <button
            type="button"
            className="project-detail__btn project-detail__btn--primary"
            onClick={(e) => {
              e.preventDefault();
              fundCtx.onActivatePackage(row.rollup.address, projectAddress);
            }}
            disabled={fundCtx.pending}
          >
            Approve package
          </button>
        </div>
      )}

      {fundCtx.isFinance &&
        status === "draft" &&
        !milestoneScheduleComplete && (
          <p className="project-detail__package-note">
            Approval opens once milestone amounts equal the package cap.
          </p>
        )}

      {fundCtx.isFinance &&
        status === "active" &&
        row.rollup.package.fundedAmount < row.rollup.package.capAmount &&
        !milestoneScheduleComplete && (
          <p className="project-detail__package-note">
            Funding opens once milestone amounts equal the package cap.
          </p>
        )}

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
