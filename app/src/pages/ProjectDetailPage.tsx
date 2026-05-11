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
  isProjectManager: boolean;
  fundTarget: string | null;
  fundText: string;
  fundError: string | null;
  assignTarget: string | null;
  assignContractorText: string;
  assignContractorError: string | null;
  demoContractorAddress: string;
  pending: boolean;
  onActivatePackage: (
    packageAddress: PublicKey,
    projectAddress: PublicKey,
  ) => void;
  onOpenFund: (packageAddress: string) => void;
  onChangeFundText: (v: string) => void;
  onCancelFund: () => void;
  onSubmitFund: (packageAddress: PublicKey, projectAddress: PublicKey) => void;
  onOpenAssignContractor: (packageAddress: string) => void;
  onChangeAssignContractorText: (v: string) => void;
  onCancelAssignContractor: () => void;
  onSubmitAssignContractor: (
    packageAddress: PublicKey,
    projectAddress: PublicKey,
  ) => void;
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

const unassignedContractorAddress = PublicKey.default.toBase58();

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
  const [addPkgStep, setAddPkgStep] = useState<1 | 2>(1);
  const [scopeText, setScopeText] = useState("");
  const [capText, setCapText] = useState("");
  const [capError, setCapError] = useState<string | null>(null);
  const [contractorText, setContractorText] = useState(
    unassignedContractorAddress,
  );
  const [contractorError, setContractorError] = useState<string | null>(null);
  const [packageMode, setPackageMode] = useState<"simple" | "milestone">(
    "simple",
  );
  const [packageRefText, setPackageRefText] = useState("");
  const [packageStartDate, setPackageStartDate] = useState("");
  const [packageCompletionDate, setPackageCompletionDate] = useState("");
  const [highApprovalRequired, setHighApprovalRequired] = useState(false);
  const [milestoneRows, setMilestoneRows] = useState<MilestoneFormRow[]>(() =>
    defaultMilestoneRows(),
  );
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  const [fundTarget, setFundTarget] = useState<string | null>(null);
  const [fundText, setFundText] = useState("");
  const [fundError, setFundError] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [assignContractorText, setAssignContractorText] = useState(
    world.contractor.publicKey.toBase58(),
  );
  const [assignContractorError, setAssignContractorError] = useState<
    string | null
  >(null);

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
      setContractorError("Invalid contractor account");
      return;
    }
    if (role === "financeDirector" && contractorKey.equals(PublicKey.default)) {
      setContractorError("Finance-created active packages need a contractor.");
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
      contractorDisplayName: contractorKey.equals(PublicKey.default)
        ? "Unassigned estimate"
        : "Demo Contractor",
      contractModel: packageMode === "milestone" ? "milestone" : "bespoke",
      startDate: packageStartDate || undefined,
      endDate: packageCompletionDate || undefined,
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
      setAddPkgStep(1);
      setScopeText("");
      setCapText("");
      setContractorText(unassignedContractorAddress);
      setPackageMode("simple");
      setPackageRefText("");
      setPackageStartDate("");
      setPackageCompletionDate("");
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

  const onSubmitAssignContractor = (
    packageAddress: PublicKey,
    projectAddress: PublicKey,
  ) => {
    let assignedContractor: PublicKey;
    try {
      assignedContractor = new PublicKey(assignContractorText.trim());
    } catch {
      setAssignContractorError("Invalid contractor account");
      return;
    }
    if (assignedContractor.equals(PublicKey.default)) {
      setAssignContractorError("Choose a contractor before assignment.");
      return;
    }
    setAssignContractorError(null);
    void onAct(() =>
      client.setDraftContractor({
        drafter: wallet,
        project: projectAddress,
        workPackage: packageAddress,
        contractor: assignedContractor,
      }),
    ).then(() => {
      setAssignTarget(null);
      setAssignContractorText(world.contractor.publicKey.toBase58());
    });
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
    isProjectManager: role === "projectManager",
    fundTarget,
    fundText,
    fundError,
    assignTarget,
    assignContractorText,
    assignContractorError,
    demoContractorAddress: world.contractor.publicKey.toBase58(),
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
    onOpenAssignContractor: (addr) => {
      setAssignTarget(addr);
      setAssignContractorText(world.contractor.publicKey.toBase58());
      setAssignContractorError(null);
    },
    onChangeAssignContractorText: (v) => {
      setAssignContractorText(v);
      setAssignContractorError(null);
    },
    onCancelAssignContractor: () => {
      setAssignTarget(null);
      setAssignContractorText(world.contractor.publicKey.toBase58());
      setAssignContractorError(null);
    },
    onSubmitAssignContractor,
  };

  const closeAddPackageModal = () => {
    setAddPkgOpen(false);
    setAddPkgStep(1);
    setScopeText("");
    setCapText("");
    setCapError(null);
    setContractorText(unassignedContractorAddress);
    setContractorError(null);
    setPackageMode("simple");
    setPackageRefText("");
    setPackageStartDate("");
    setPackageCompletionDate("");
    setMilestoneRows(defaultMilestoneRows());
    setMilestoneError(null);
    setHighApprovalRequired(false);
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
                onClick={() => {
                  setAddPkgOpen(true);
                  setAddPkgStep(1);
                }}
                disabled={pending}
              >
                Add estimated package
              </button>
            )}
          </div>

          {addPkgOpen && (
            <AddPackageModal
              pending={pending}
              role={role}
              step={addPkgStep}
              scopeText={scopeText}
              capText={capText}
              capError={capError}
              contractorText={contractorText}
              contractorError={contractorError}
              demoContractorAddress={world.contractor.publicKey.toBase58()}
              packageMode={packageMode}
              packageRefText={packageRefText}
              packageStartDate={packageStartDate}
              packageCompletionDate={packageCompletionDate}
              highApprovalRequired={highApprovalRequired}
              milestoneRows={milestoneRows}
              milestoneError={milestoneError}
              canSubmit={
                scopeText.trim().length > 0 && capText.trim().length > 0
              }
              onStep={setAddPkgStep}
              onClose={closeAddPackageModal}
              onScopeText={setScopeText}
              onCapText={(value) => {
                setCapText(value);
                setCapError(null);
              }}
              onContractorText={(value) => {
                setContractorText(value);
                setContractorError(null);
              }}
              onPackageMode={(value) => {
                setPackageMode(value);
                setMilestoneError(null);
              }}
              onPackageRefText={setPackageRefText}
              onPackageStartDate={setPackageStartDate}
              onPackageCompletionDate={setPackageCompletionDate}
              onHighApprovalRequired={setHighApprovalRequired}
              onMilestoneRows={setMilestoneRows}
              onMilestoneError={setMilestoneError}
              onSubmit={onAddPackageSubmit}
            />
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

          <div className="project-detail__table-card">
            {packages.length === 0 ? (
              <div className="project-detail__records-empty">
                <h3>No packages added yet</h3>
                <p>
                  Project Managers add estimated work packages before contractor
                  agreement and finance approval.
                </p>
                {canAddPackage && (
                  <button
                    type="button"
                    className="project-detail__btn project-detail__btn--primary"
                    onClick={() => {
                      setAddPkgOpen(true);
                      setAddPkgStep(1);
                    }}
                    disabled={pending}
                  >
                    Add Estimated Package
                  </button>
                )}
              </div>
            ) : (
              <table className="project-detail__package-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Cap</th>
                    <th>Milestone Stage</th>
                    <th>Funded</th>
                    <th>Released</th>
                    <th>Requests</th>
                    <th>Finance Approval</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((row) => (
                    <PackageTableRow
                      key={row.rollup.address.toBase58()}
                      row={row}
                      projectAddress={projectKey}
                      fundCtx={fundCtx}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

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
          <ProjectSnapshotCard rollup={rollup} />
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

const ProjectSnapshotCard = ({ rollup }: { rollup: ProjectRollup }) => (
  <section className="project-detail__snapshot">
    <div className="project-detail__snapshot-head">
      <h2>Project Snapshot</h2>
      <StatusPill
        tone={rollup.project.status === "completed" ? "success" : "info"}
      >
        {projectStatusLabel(rollup.project.status)}
      </StatusPill>
    </div>
    <ul className="project-detail__snapshot-list">
      <SnapshotRow label="Budget">
        <Money amount={rollup.projectBudget} withSymbol />
      </SnapshotRow>
      <SnapshotRow label="Allocated">
        <Money amount={rollup.allocatedPackageBudget} withSymbol />
      </SnapshotRow>
      <SnapshotRow label="Remaining">
        <Money amount={rollup.remainingAllocatableBudget} withSymbol />
      </SnapshotRow>
      <SnapshotRow label="Work packages">{rollup.packageCount}</SnapshotRow>
      <SnapshotRow label="In review">
        {rollup.packagesWithActiveRequest}
      </SnapshotRow>
    </ul>
  </section>
);

const SnapshotRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <li className="project-detail__snapshot-row">
    <span>{label}</span>
    <strong>{children}</strong>
  </li>
);

interface AddPackageModalProps {
  pending: boolean;
  role: DemoRole;
  step: 1 | 2;
  scopeText: string;
  capText: string;
  capError: string | null;
  contractorText: string;
  contractorError: string | null;
  demoContractorAddress: string;
  packageMode: "simple" | "milestone";
  packageRefText: string;
  packageStartDate: string;
  packageCompletionDate: string;
  highApprovalRequired: boolean;
  milestoneRows: MilestoneFormRow[];
  milestoneError: string | null;
  canSubmit: boolean;
  onStep: (step: 1 | 2) => void;
  onClose: () => void;
  onScopeText: (value: string) => void;
  onCapText: (value: string) => void;
  onContractorText: (value: string) => void;
  onPackageMode: (value: "simple" | "milestone") => void;
  onPackageRefText: (value: string) => void;
  onPackageStartDate: (value: string) => void;
  onPackageCompletionDate: (value: string) => void;
  onHighApprovalRequired: (value: boolean) => void;
  onMilestoneRows: React.Dispatch<React.SetStateAction<MilestoneFormRow[]>>;
  onMilestoneError: (value: string | null) => void;
  onSubmit: () => void;
}

const AddPackageModal = ({
  pending,
  role,
  step,
  scopeText,
  capText,
  capError,
  contractorText,
  contractorError,
  demoContractorAddress,
  packageMode,
  packageRefText,
  packageStartDate,
  packageCompletionDate,
  highApprovalRequired,
  milestoneRows,
  milestoneError,
  canSubmit,
  onStep,
  onClose,
  onScopeText,
  onCapText,
  onContractorText,
  onPackageMode,
  onPackageRefText,
  onPackageStartDate,
  onPackageCompletionDate,
  onHighApprovalRequired,
  onMilestoneRows,
  onMilestoneError,
  onSubmit,
}: AddPackageModalProps) => (
  <div className="project-detail__modal-overlay" role="presentation">
    <section
      className="project-detail__modal-card project-detail__modal-card--package"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-package-title"
    >
      <div className="project-detail__modal-header">
        <h2 id="add-package-title">Add Estimated Work Package</h2>
        <button
          className="project-detail__modal-close"
          type="button"
          onClick={onClose}
          disabled={pending}
          aria-label="Close"
        >
          x
        </button>
      </div>
      <div
        className="project-detail__modal-steps"
        aria-label="Create package steps"
      >
        <span
          className={`project-detail__modal-step ${step === 1 ? "is-active" : ""}`}
        >
          <span>1</span>Package setup
        </span>
        <i />
        <span
          className={`project-detail__modal-step ${step === 2 ? "is-active" : ""}`}
        >
          <span>2</span>Payment schedule
        </span>
      </div>
      <div className="project-detail__modal-form">
        {step === 1 ? (
          <>
            <ProjectDetailField label="Package Name">
              <input
                type="text"
                value={scopeText}
                onChange={(e) => onScopeText(e.target.value)}
                disabled={pending}
              />
            </ProjectDetailField>
            <ProjectDetailField label="Contract Type">
              <select
                value={packageMode}
                onChange={(e) =>
                  onPackageMode(
                    e.target.value === "milestone" ? "milestone" : "simple",
                  )
                }
                disabled={pending}
              >
                <option value="milestone">Milestone-Based</option>
                <option value="simple">Bespoke Schedule</option>
              </select>
            </ProjectDetailField>
            <ProjectDetailField label="Estimated Budget - GBP">
              <input
                type="number"
                min="0"
                step="1000"
                value={capText}
                onChange={(e) => onCapText(e.target.value)}
                disabled={pending}
              />
              {capError && (
                <p className="project-detail__form-error">{capError}</p>
              )}
            </ProjectDetailField>
            <ProjectDetailField label="Contractor Agreement">
              <select
                value={contractorText}
                onChange={(e) => onContractorText(e.target.value)}
                disabled={pending}
              >
                <option value={unassignedContractorAddress}>
                  Unassigned estimate
                </option>
                <option value={demoContractorAddress}>Daniel Okafor</option>
              </select>
              {contractorError && (
                <p className="project-detail__form-error">{contractorError}</p>
              )}
            </ProjectDetailField>
            <ProjectDetailField label="Contract Reference">
              <input
                type="text"
                value={packageRefText}
                onChange={(e) => onPackageRefText(e.target.value)}
                disabled={pending}
              />
            </ProjectDetailField>
            <ProjectDetailField label="Start Date">
              <input
                type="date"
                value={packageStartDate}
                onChange={(e) => onPackageStartDate(e.target.value)}
                disabled={pending}
              />
            </ProjectDetailField>
            <ProjectDetailField label="Completion Date">
              <input
                type="date"
                value={packageCompletionDate}
                onChange={(e) => onPackageCompletionDate(e.target.value)}
                disabled={pending}
              />
            </ProjectDetailField>
            <label className="project-detail__checkbox-row">
              <input
                type="checkbox"
                checked={highApprovalRequired}
                onChange={(e) => onHighApprovalRequired(e.target.checked)}
                disabled={pending}
              />
              Require Director approval before Finance can release
            </label>
            <p className="project-detail__faint">
              Packages begin as estimates. When a contractor agreement and
              budget are ready, Finance approves the package and locks escrow.
            </p>
          </>
        ) : (
          <>
            <div className="project-detail__section-head">
              <div>
                <label>Define package milestones</label>
                <p>
                  Adjust each milestone name, date, and amount before the
                  package is created.
                </p>
              </div>
              <button
                className="project-detail__btn project-detail__btn--ghost"
                type="button"
                onClick={() =>
                  onMilestoneRows((rows) => [
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
                Add milestone
              </button>
            </div>
            <div className="project-detail__budget-summary">
              Package budget: GBP {capText || "0"}
            </div>
            <div className="project-detail__milestone-grid">
              {milestoneRows.map((row, idx) => (
                <div className="project-detail__milestone-row" key={idx}>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) =>
                      onMilestoneRows((rows) =>
                        rows.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Milestone name"
                    disabled={pending}
                  />
                  <input
                    type="text"
                    value={row.amountText}
                    onChange={(e) => {
                      onMilestoneRows((rows) =>
                        rows.map((item, i) =>
                          i === idx
                            ? { ...item, amountText: e.target.value }
                            : item,
                        ),
                      );
                      onMilestoneError(null);
                    }}
                    placeholder="Amount"
                    disabled={pending}
                  />
                  <input
                    type="date"
                    value={row.startDate}
                    onChange={(e) => {
                      onMilestoneRows((rows) =>
                        rows.map((item, i) =>
                          i === idx
                            ? { ...item, startDate: e.target.value }
                            : item,
                        ),
                      );
                      onMilestoneError(null);
                    }}
                    disabled={pending}
                  />
                  <input
                    type="date"
                    value={row.endDate}
                    onChange={(e) => {
                      onMilestoneRows((rows) =>
                        rows.map((item, i) =>
                          i === idx
                            ? { ...item, endDate: e.target.value }
                            : item,
                        ),
                      );
                      onMilestoneError(null);
                    }}
                    disabled={pending}
                  />
                  <button
                    type="button"
                    className="project-detail__btn project-detail__btn--ghost"
                    onClick={() =>
                      onMilestoneRows((rows) =>
                        rows.filter((_item, i) => i !== idx),
                      )
                    }
                    disabled={pending || milestoneRows.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {milestoneError && (
              <p className="project-detail__form-error">{milestoneError}</p>
            )}
            <p className="project-detail__faint">
              Dates must be unique. Amounts are checked against the package
              budget as you edit.
            </p>
          </>
        )}
      </div>
      <div className="project-detail__modal-footer">
        <button
          className="project-detail__btn project-detail__btn--ghost"
          type="button"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </button>
        {step === 2 && (
          <button
            className="project-detail__btn project-detail__btn--ghost"
            type="button"
            onClick={() => onStep(1)}
            disabled={pending}
          >
            Back
          </button>
        )}
        {step === 1 ? (
          <button
            className="project-detail__btn project-detail__btn--primary"
            type="button"
            onClick={() => onStep(2)}
            disabled={!canSubmit || pending}
          >
            Next
          </button>
        ) : (
          <button
            className="project-detail__btn project-detail__btn--primary"
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || pending}
          >
            {role === "financeDirector"
              ? "Create Package"
              : "Add Estimated Package"}
          </button>
        )}
      </div>
    </section>
  </div>
);

const ProjectDetailField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="project-detail__modal-field">
    <span>{label}</span>
    {children}
  </label>
);

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

const PackageTableRow = ({
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
  const status = row.rollup.package.status;
  const requestStatus = row.activeRequest
    ? paymentRequestDisplayStatus(row.activeRequest)
    : null;
  const packageAddr = row.rollup.address.toBase58();
  const isFundTarget = fundCtx.fundTarget === packageAddr;
  const isAssignTarget = fundCtx.assignTarget === packageAddr;
  const contractorAssigned = !row.rollup.package.contractor.equals(
    PublicKey.default,
  );
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
  const financeApproval =
    status === "draft" && !contractorAssigned
      ? "Needs Contractor"
      : status === "draft"
        ? "Awaiting Finance Approval"
        : row.rollup.package.fundedAmount >= row.rollup.package.capAmount
          ? "Funded"
          : row.rollup.package.fundedAmount > 0n
            ? "Partially Funded"
            : "Approved";
  const financeTone =
    financeApproval === "Funded"
      ? "success"
      : financeApproval === "Partially Funded"
        ? "warning"
        : financeApproval === "Needs Contractor"
          ? "warning"
          : "info";

  return (
    <tr>
      <td>
        <a className="project-detail__table-package-link" href={wpHref}>
          {row.scope?.description?.split(".")[0] ?? row.rollup.package.scopeRef}
        </a>
      </td>
      <td>
        <Money amount={row.rollup.package.capAmount} withSymbol />
      </td>
      <td>
        {isMilestoneMode
          ? `Stage ${Math.min(row.milestones.length, 1)} of ${row.milestones.length}`
          : "Package level"}
      </td>
      <td>
        <Money amount={row.rollup.package.fundedAmount} withSymbol />
      </td>
      <td>
        <Money amount={row.rollup.package.releasedAmount} withSymbol />
      </td>
      <td>
        {requestStatus ? paymentRequestStatusLabel(requestStatus) : "0 open"}
      </td>
      <td>
        <StatusPill tone={financeTone}>{financeApproval}</StatusPill>
      </td>
      <td>
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
      </td>
      <td className="project-detail__table-actions">
        {fundCtx.isProjectManager &&
        status === "draft" &&
        !contractorAssigned &&
        !isAssignTarget ? (
          <button
            type="button"
            className="project-detail__btn project-detail__btn--primary"
            onClick={() => fundCtx.onOpenAssignContractor(packageAddr)}
            disabled={fundCtx.pending}
          >
            Assign Contractor
          </button>
        ) : fundCtx.isFinance && status === "draft" && !contractorAssigned ? (
          <span className="project-detail__faint">Assign contractor first</span>
        ) : fundCtx.isFinance &&
          status === "draft" &&
          milestoneScheduleComplete ? (
          <button
            type="button"
            className="project-detail__btn project-detail__btn--primary"
            onClick={() =>
              fundCtx.onActivatePackage(row.rollup.address, projectAddress)
            }
            disabled={fundCtx.pending}
          >
            Approve escrow
          </button>
        ) : canFund && !isFundTarget ? (
          <button
            type="button"
            className="project-detail__btn project-detail__btn--ghost"
            onClick={() => fundCtx.onOpenFund(packageAddr)}
            disabled={fundCtx.pending}
          >
            Fund escrow
          </button>
        ) : (
          <a className="project-detail__text-link" href={wpHref}>
            View
          </a>
        )}
        {status === "draft" && isAssignTarget && (
          <div className="project-detail__fund-popover">
            <select
              className="project-detail__form-input"
              value={fundCtx.assignContractorText}
              onChange={(e) =>
                fundCtx.onChangeAssignContractorText(e.target.value)
              }
              disabled={fundCtx.pending}
            >
              <option value={unassignedContractorAddress}>
                Unassigned estimate
              </option>
              <option value={fundCtx.demoContractorAddress}>
                Daniel Okafor
              </option>
            </select>
            {fundCtx.assignContractorError && (
              <p className="project-detail__form-error">
                {fundCtx.assignContractorError}
              </p>
            )}
            <button
              type="button"
              className="project-detail__btn project-detail__btn--primary"
              onClick={() =>
                fundCtx.onSubmitAssignContractor(
                  row.rollup.address,
                  projectAddress,
                )
              }
              disabled={
                fundCtx.pending ||
                fundCtx.assignContractorText === unassignedContractorAddress
              }
            >
              Assign
            </button>
            <button
              type="button"
              className="project-detail__btn project-detail__btn--ghost"
              onClick={fundCtx.onCancelAssignContractor}
              disabled={fundCtx.pending}
            >
              Cancel
            </button>
          </div>
        )}
        {canFund && isFundTarget && (
          <div className="project-detail__fund-popover">
            <input
              className="project-detail__form-input"
              type="text"
              value={fundCtx.fundText}
              onChange={(e) => fundCtx.onChangeFundText(e.target.value)}
              placeholder="e.g. 10000"
              disabled={fundCtx.pending}
            />
            {fundCtx.fundError && (
              <p className="project-detail__form-error">{fundCtx.fundError}</p>
            )}
            <button
              type="button"
              className="project-detail__btn project-detail__btn--primary"
              onClick={() =>
                fundCtx.onSubmitFund(row.rollup.address, projectAddress)
              }
              disabled={fundCtx.pending || fundCtx.fundText.trim().length === 0}
            >
              Fund
            </button>
            <button
              type="button"
              className="project-detail__btn project-detail__btn--ghost"
              onClick={fundCtx.onCancelFund}
              disabled={fundCtx.pending}
            >
              Cancel
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

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

export { PackageCard as LegacyPackageCardForPrototypeParity };
