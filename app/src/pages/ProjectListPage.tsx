import { useEffect, useMemo, useState } from "react";
import { useClients } from "../components/clientsContext";
import { buildHash } from "../lib/router";
import { walletForRole } from "../lib/clients";
import { CONSTRUKT_PROGRAM_ID } from "../lib/config";
import { deriveProjectAddress } from "../lib/pda";
import { parseMockUsdc } from "../lib/format";
import { shortAddress } from "../lib/format";
import { nextProjectId, projectMetadataRef } from "../lib/ids";
import { friendlyClientError } from "../lib/program";
import type { TxResult } from "../lib/program";
import {
  filterProjectsByContractor,
  selectPackageRollup,
  selectProjectRollup,
} from "../selectors/projectSelectors";
import { isPaymentRequestActive } from "../selectors/paymentSelectors";
import type {
  PackageRollup,
  ProjectRollup,
} from "../selectors/projectSelectors";
import type {
  Fetched,
  ProjectAccount,
  WorkPackageAccount,
} from "../lib/program";
import type { DemoRole } from "../lib/theme";
import type {
  ProjectContractModel,
  ProjectMetadata,
} from "../lib/metadataClient";
import "./ProjectListPage.css";

interface ActionFeedback {
  kind: "success" | "error";
  message: string;
}

interface LoadedProject {
  rollup: ProjectRollup;
  metadata: ProjectMetadata | null;
  packagesWithActiveHeldRequest: number;
}

interface ProjectListPageProps {
  role: DemoRole;
}

export const ProjectListPage = ({ role }: ProjectListPageProps) => {
  const { client, metadata, metadataWriter, world } = useClients();
  const [loaded, setLoaded] = useState<LoadedProject[] | null>(null);
  const [allProjects, setAllProjects] = useState<Fetched<ProjectAccount>[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [nameText, setNameText] = useState("");
  const [clientText, setClientText] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [budgetText, setBudgetText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractModel, setContractModel] =
    useState<ProjectContractModel>("milestone");

  const wallet = walletForRole(world, role);

  const onAct = async (op: () => Promise<TxResult>) => {
    setPending(true);
    setFeedback(null);
    try {
      const result = await op();
      setFeedback({
        kind: "success",
        message: `Submitted - ${shortAddress(result.signature, {
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
    let cancelled = false;
    void (async () => {
      const all = await client.fetchProjects();
      const packageMap = new Map<string, Fetched<WorkPackageAccount>[]>();

      for (const project of all) {
        const packages = await client.fetchWorkPackagesForProject(
          project.address,
        );
        packageMap.set(project.address.toBase58(), packages);
      }

      const visible =
        role === "contractor"
          ? filterProjectsByContractor(
              all,
              packageMap,
              world.contractor.publicKey,
            )
          : all;

      const next: LoadedProject[] = [];
      for (const project of visible) {
        const packages = packageMap.get(project.address.toBase58()) ?? [];
        const rollups: PackageRollup[] = [];
        for (const pkg of packages) {
          const requests = await client.fetchPaymentRequestsForPackage(
            pkg.address,
          );
          const activeFetchedRequest = pkg.account.hasActiveRequest
            ? (requests.find((request) =>
                request.address.equals(pkg.account.activeRequest),
              ) ?? null)
            : ([...requests]
                .filter((request) => isPaymentRequestActive(request.account))
                .sort((a, b) =>
                  a.account.requestId < b.account.requestId ? 1 : -1,
                )[0] ?? null);
          rollups.push(
            selectPackageRollup(
              pkg,
              activeFetchedRequest?.account ?? null,
              activeFetchedRequest?.address ?? null,
            ),
          );
        }
        const projectMetadata = await metadata.resolveProject(
          project.account.metadataRef,
        );
        next.push({
          rollup: selectProjectRollup(project, rollups),
          metadata: projectMetadata,
          packagesWithActiveHeldRequest: rollups.filter((r) => r.isHeld).length,
        });
      }

      if (!cancelled) {
        setLoaded(next);
        setAllProjects(all);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, metadata, world, role, refreshKey]);

  const grouped = useMemo(
    () => groupProjects(loaded ?? [], role),
    [loaded, role],
  );

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateStep(1);
    setNameText("");
    setClientText("");
    setReferenceText("");
    setBudgetText("");
    setStartDate("");
    setEndDate("");
    setContractModel("milestone");
  };

  const onCreateSubmit = () => {
    const name = nameText.trim();
    if (!name) return;

    let budgetAmount: bigint;
    try {
      budgetAmount = parseMockUsdc(budgetText);
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Invalid budget amount",
      });
      return;
    }
    if (budgetAmount <= 0n) {
      setFeedback({
        kind: "error",
        message: "Budget must be greater than zero.",
      });
      return;
    }

    const projectId = nextProjectId(allProjects);
    const metadataRef = projectMetadataRef(wallet, projectId);
    const projectMetadata: ProjectMetadata = {
      client: clientText.trim() || name,
      contractModel,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description: referenceText.trim() || undefined,
      team: [],
    };

    void onAct(async () => {
      const result = await client.initializeProject({
        authority: wallet,
        projectId,
        mint: world.mint,
        budgetAmount,
        name,
        metadataRef,
      });
      metadataWriter?.putProject(metadataRef, projectMetadata);
      await client.assignProjectDrafter({
        authority: wallet,
        project: deriveProjectAddress(CONSTRUKT_PROGRAM_ID, wallet, projectId),
        wallet: world.pm.publicKey,
      });
      return result;
    }).then(closeCreate);
  };

  if (loaded === null) {
    return <div className="project-list__empty">Loading projects...</div>;
  }

  return (
    <section className="project-list">
      <div className="project-list__head">
        <h1>Projects</h1>
        {role === "financeDirector" && (
          <button
            className="project-list__btn project-list__btn--primary"
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setCreateStep(1);
            }}
            disabled={pending}
          >
            Create project
          </button>
        )}
      </div>

      {feedback && (
        <p
          className={`project-list__feedback project-list__feedback--${feedback.kind}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </p>
      )}

      <div className="project-list__groups">
        <ProjectGroup
          title="Ongoing Projects"
          empty="No ongoing projects right now."
          projects={grouped.ongoing}
          completeGroup={false}
        />
        <ProjectGroup
          title="Completed Projects"
          empty="No completed projects yet."
          projects={grouped.completed}
          completeGroup
        />
      </div>

      {createOpen && (
        <CreateProjectModal
          pending={pending}
          step={createStep}
          nameText={nameText}
          clientText={clientText}
          referenceText={referenceText}
          budgetText={budgetText}
          startDate={startDate}
          endDate={endDate}
          contractModel={contractModel}
          canCreate={nameText.trim().length > 0 && budgetText.trim().length > 0}
          onClose={closeCreate}
          onStep={setCreateStep}
          onName={setNameText}
          onClient={setClientText}
          onReference={setReferenceText}
          onBudget={setBudgetText}
          onStart={setStartDate}
          onEnd={setEndDate}
          onContractModel={setContractModel}
          onCreate={onCreateSubmit}
        />
      )}
    </section>
  );
};

interface GroupedProject extends LoadedProject {
  daysUntilTask: number | null;
  dueLabel: string;
}

const groupProjects = (
  projects: LoadedProject[],
  role: DemoRole,
): { ongoing: GroupedProject[]; completed: GroupedProject[] } => {
  const withDue = projects.map((project) => {
    const due = projectDue(project, role);
    return { ...project, ...due };
  });
  return {
    ongoing: withDue
      .filter((project) => project.rollup.project.status !== "completed")
      .sort((a, b) => (a.daysUntilTask ?? 9999) - (b.daysUntilTask ?? 9999)),
    completed: withDue
      .filter((project) => project.rollup.project.status === "completed")
      .sort((a, b) =>
        b.rollup.project.createdAt < a.rollup.project.createdAt ? -1 : 1,
      ),
  };
};

const projectDue = (
  entry: LoadedProject,
  role: DemoRole,
): { daysUntilTask: number | null; dueLabel: string } => {
  const packageCount = entry.rollup.packageCount;
  const packageLabel =
    role === "contractor"
      ? `${packageCount} assigned package${packageCount === 1 ? "" : "s"}`
      : `${packageCount} work package${packageCount === 1 ? "" : "s"}`;

  if (entry.rollup.project.status === "completed") {
    return {
      daysUntilTask: null,
      dueLabel: `${packageLabel} - completed ${formatDateOnly(
        entry.metadata?.endDate,
      )}`,
    };
  }

  const days = daysUntil(entry.metadata?.endDate);
  if (days === null) return { daysUntilTask: null, dueLabel: packageLabel };
  if (days < 0)
    return { daysUntilTask: days, dueLabel: `${packageLabel} - overdue` };
  if (days === 0) {
    return {
      daysUntilTask: days,
      dueLabel: `${packageLabel} - next due today`,
    };
  }
  if (days === 1) {
    return {
      daysUntilTask: days,
      dueLabel: `${packageLabel} - next due in 1 day`,
    };
  }
  return {
    daysUntilTask: days,
    dueLabel: `${packageLabel} - next due in ${days} days`,
  };
};

const daysUntil = (dateText?: string): number | null => {
  if (!dateText) return null;
  const due = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
};

const formatDateOnly = (dateText?: string): string => {
  if (!dateText) return "date not set";
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const ProjectGroup = ({
  title,
  empty,
  projects,
  completeGroup,
}: {
  title: string;
  empty: string;
  projects: GroupedProject[];
  completeGroup: boolean;
}) => (
  <section className="project-list__group">
    <div className="project-list__group-head">
      <h2>{title}</h2>
      <span>
        {projects.length} project{projects.length === 1 ? "" : "s"}
      </span>
    </div>
    <div className="project-list__group-list">
      {projects.length === 0 ? (
        <div className="project-list__simple-empty">{empty}</div>
      ) : (
        projects.map((project) => (
          <ProjectSimpleItem
            key={project.rollup.address.toBase58()}
            project={project}
            completeGroup={completeGroup}
          />
        ))
      )}
    </div>
  </section>
);

const ProjectSimpleItem = ({
  project,
  completeGroup,
}: {
  project: GroupedProject;
  completeGroup: boolean;
}) => {
  const href = buildHash("projectDetail", {
    address: project.rollup.address.toBase58(),
  });
  const urgent =
    !completeGroup &&
    project.daysUntilTask !== null &&
    project.daysUntilTask <= 3;
  return (
    <a className="project-list__simple-item" href={href}>
      <span className="project-list__simple-name">
        {project.rollup.project.name}
      </span>
      <span
        className={`project-list__simple-due ${
          completeGroup ? "is-complete" : urgent ? "is-urgent" : ""
        }`}
      >
        {project.dueLabel}
      </span>
    </a>
  );
};

interface CreateProjectModalProps {
  pending: boolean;
  step: 1 | 2;
  nameText: string;
  clientText: string;
  referenceText: string;
  budgetText: string;
  startDate: string;
  endDate: string;
  contractModel: ProjectContractModel;
  canCreate: boolean;
  onClose: () => void;
  onStep: (step: 1 | 2) => void;
  onName: (value: string) => void;
  onClient: (value: string) => void;
  onReference: (value: string) => void;
  onBudget: (value: string) => void;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  onContractModel: (value: ProjectContractModel) => void;
  onCreate: () => void;
}

const CreateProjectModal = ({
  pending,
  step,
  nameText,
  clientText,
  referenceText,
  budgetText,
  startDate,
  endDate,
  contractModel,
  canCreate,
  onClose,
  onStep,
  onName,
  onClient,
  onReference,
  onBudget,
  onStart,
  onEnd,
  onContractModel,
  onCreate,
}: CreateProjectModalProps) => (
  <div className="project-list__modal-overlay" role="presentation">
    <section
      className="project-list__modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
    >
      <div className="project-list__modal-header">
        <h2 id="new-project-title">Create New Project</h2>
        <button
          className="project-list__modal-close"
          type="button"
          onClick={onClose}
          disabled={pending}
          aria-label="Close"
        >
          x
        </button>
      </div>
      <div
        className="project-list__modal-steps"
        aria-label="Create project steps"
      >
        <span
          className={`project-list__modal-step ${step === 1 ? "is-active" : ""}`}
        >
          <span>1</span>Project setup
        </span>
        <i />
        <span
          className={`project-list__modal-step ${step === 2 ? "is-active" : ""}`}
        >
          <span>2</span>Payment sections
        </span>
      </div>

      {step === 1 ? (
        <div className="project-list__modal-form">
          <label className="project-list__checkbox-row">
            <input type="checkbox" defaultChecked disabled={pending} />
            We are the end client for this project
          </label>
          <Field label="Project Name">
            <input
              type="text"
              value={nameText}
              onChange={(e) => onName(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Client / Organisation">
            <input
              type="text"
              value={clientText}
              onChange={(e) => onClient(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Contract Reference">
            <input
              type="text"
              value={referenceText}
              onChange={(e) => onReference(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Overall Project Budget - GBP">
            <input
              type="number"
              min="0"
              step="1000"
              value={budgetText}
              onChange={(e) => onBudget(e.target.value)}
              placeholder="e.g. 1250000"
              disabled={pending}
            />
          </Field>
          <PaymentStructurePicker
            contractModel={contractModel}
            onContractModel={onContractModel}
            disabled={pending}
          />
          <Field label="Start Date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStart(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Estimated Completion">
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEnd(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Invite / Assign Project Manager Owner">
            <select disabled={pending} defaultValue="Eleanor Lane">
              <option>Eleanor Lane</option>
              <option>Emma Watson</option>
              <option>Ravi Henson</option>
            </select>
          </Field>
          <Field label="Assign Finance Director">
            <select disabled={pending} defaultValue="Maya Shah">
              <option>Maya Shah</option>
            </select>
          </Field>
        </div>
      ) : (
        <div className="project-list__modal-form">
          <div className="project-list__section-head">
            <div>
              <label>Define project milestones</label>
              <p>
                Set the milestone names, target dates, and budget allowance for
                each stage.
              </p>
            </div>
          </div>
          <div className="project-list__budget-summary">
            Overall budget: GBP {budgetText || "0"}
          </div>
          <p className="project-list__faint">
            These sections give the project its starting payment structure. You
            can still add detailed work packages after the project is created.
          </p>
        </div>
      )}

      <div className="project-list__modal-footer">
        <button
          className="project-list__btn project-list__btn--ghost"
          type="button"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </button>
        {step === 2 && (
          <button
            className="project-list__btn project-list__btn--ghost"
            type="button"
            onClick={() => onStep(1)}
            disabled={pending}
          >
            Back
          </button>
        )}
        {step === 1 ? (
          <button
            className="project-list__btn project-list__btn--primary"
            type="button"
            onClick={() => onStep(2)}
            disabled={!canCreate || pending}
          >
            Next
          </button>
        ) : (
          <button
            className="project-list__btn project-list__btn--primary"
            type="button"
            onClick={onCreate}
            disabled={!canCreate || pending}
          >
            Create Project
          </button>
        )}
      </div>
    </section>
  </div>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="project-list__form-field">
    <span>{label}</span>
    {children}
  </label>
);

const PaymentStructurePicker = ({
  contractModel,
  onContractModel,
  disabled,
}: {
  contractModel: ProjectContractModel;
  onContractModel: (value: ProjectContractModel) => void;
  disabled: boolean;
}) => (
  <div className="project-list__contract-models" role="radiogroup">
    <span className="project-list__form-field-label">Payment Structure</span>
    {[
      {
        key: "milestone",
        title: "Milestone-Based",
        text: "Fixed payments released when defined project stages are completed and approved.",
        badge: "Most common",
      },
      {
        key: "valuation",
        title: "Valuation-Based",
        text: "Periodic payment assessments at set intervals. Suitable for NEC and JCT contracts.",
        badge: "NEC - JCT",
      },
      {
        key: "bespoke",
        title: "Bespoke Schedule",
        text: "Fully custom payment schedule with manual release triggers defined by your team.",
        badge: "Flexible",
      },
    ].map((option) => (
      <button
        key={option.key}
        className={`project-list__contract-card ${
          contractModel === option.key ? "is-selected" : ""
        }`}
        type="button"
        role="radio"
        aria-checked={contractModel === option.key}
        onClick={() => onContractModel(option.key as ProjectContractModel)}
        disabled={disabled}
      >
        <h3>{option.title}</h3>
        <p>{option.text}</p>
        <span>{option.badge}</span>
      </button>
    ))}
    <p className="project-list__faint">
      This sets the project payment structure. Work packages can still use their
      own contract type where needed.
    </p>
  </div>
);
