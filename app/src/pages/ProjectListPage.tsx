import { useEffect, useState } from "react";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
import { walletForRole } from "../lib/clients";
import { shortAddress } from "../lib/format";
import { friendlyClientError } from "../lib/program";
import type { TxResult } from "../lib/program";
import {
  filterProjectsByContractor,
  projectStatusLabel,
  selectPackageRollup,
  selectProjectRollup,
} from "../selectors/projectSelectors";
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
import type { ProjectMetadata } from "../lib/metadataClient";
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
  /** The current demo role drives which projects the list shows. */
  role: DemoRole;
}

export const ProjectListPage = ({ role }: ProjectListPageProps) => {
  const { client, metadata, metadataWriter, world } = useClients();
  const [loaded, setLoaded] = useState<LoadedProject[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [nameText, setNameText] = useState("");
  const [clientText, setClientText] = useState("");

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
    let cancelled = false;
    void (async () => {
      const allProjects = await client.fetchProjects();

      const packageMap = new Map<string, Fetched<WorkPackageAccount>[]>();
      for (const project of allProjects) {
        const packages = await client.fetchWorkPackagesForProject(
          project.address,
        );
        packageMap.set(project.address.toBase58(), packages);
      }

      const visible =
        role === "contractor"
          ? filterProjectsByContractor(
              allProjects,
              packageMap,
              world.contractor.publicKey,
            )
          : allProjects;

      const next: LoadedProject[] = [];
      for (const project of visible) {
        const packages = packageMap.get(project.address.toBase58()) ?? [];
        const rollups: PackageRollup[] = [];
        for (const pkg of packages) {
          const activeRequest = pkg.account.hasActiveRequest
            ? await client.fetchPaymentRequest(pkg.account.activeRequest)
            : null;
          rollups.push(selectPackageRollup(pkg, activeRequest));
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
      if (!cancelled) setLoaded(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [client, metadata, world, role, refreshKey]);

  const onCreateSubmit = () => {
    const name = nameText.trim();
    if (!name) return;
    const projectId = BigInt(Date.now());
    const metadataRef = `metadata://demo/project-${Date.now()}`;
    metadataWriter?.putProject(metadataRef, {
      client: clientText.trim() || name,
      contractModel: "milestone",
      team: [],
    });
    void onAct(() =>
      client.initializeProject({
        authority: wallet,
        projectId,
        name,
        metadataRef,
      }),
    ).then(() => {
      setCreateOpen(false);
      setNameText("");
      setClientText("");
    });
  };

  if (loaded === null) {
    return <div className="project-list__empty">Loading projects…</div>;
  }

  return (
    <section className="project-list">
      <header className="project-list__head">
        <div className="project-list__head-row">
          <div>
            <h1>Projects</h1>
            <p className="project-list__lead">
              {role === "contractor"
                ? "Projects with at least one work package assigned to you."
                : "All active projects under your authority."}
            </p>
          </div>
          {role === "financeDirector" && (
            <button
              type="button"
              className="project-list__btn project-list__btn--primary"
              onClick={() => setCreateOpen((v) => !v)}
              disabled={pending}
            >
              + New project
            </button>
          )}
        </div>

        {createOpen && (
          <div className="project-list__create-form">
            <div className="project-list__form-field">
              <label className="project-list__form-label">Name</label>
              <input
                className="project-list__form-input"
                type="text"
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                placeholder="Project name"
                disabled={pending}
              />
            </div>
            <div className="project-list__form-field">
              <label className="project-list__form-label">
                Client (optional)
              </label>
              <input
                className="project-list__form-input"
                type="text"
                value={clientText}
                onChange={(e) => setClientText(e.target.value)}
                placeholder="Client name"
                disabled={pending}
              />
            </div>
            <div className="project-list__create-actions">
              <button
                type="button"
                className="project-list__btn project-list__btn--ghost"
                onClick={() => {
                  setCreateOpen(false);
                  setNameText("");
                  setClientText("");
                }}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="project-list__btn project-list__btn--primary"
                onClick={onCreateSubmit}
                disabled={pending || nameText.trim().length === 0}
              >
                Create project
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <p
            className={`project-list__feedback project-list__feedback--${feedback.kind}`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </p>
        )}
      </header>

      {loaded.length === 0 ? (
        <div className="project-list__empty">
          {role === "contractor"
            ? "No projects assigned to this wallet yet."
            : "No projects yet."}
        </div>
      ) : (
        <ul className="project-list__items">
          {loaded.map((entry) => (
            <ProjectListItem
              key={entry.rollup.address.toBase58()}
              entry={entry}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

const projectStatusTone = (
  status: ProjectAccount["status"],
): "info" | "success" | "neutral" => {
  if (status === "completed") return "success";
  if (status === "cancelled") return "neutral";
  return "info";
};

const ProjectListItem = ({ entry }: { entry: LoadedProject }) => {
  const { rollup, metadata, packagesWithActiveHeldRequest } = entry;
  const detailHref = buildHash("projectDetail", {
    address: rollup.address.toBase58(),
  });
  return (
    <li className="project-list__item">
      <a className="project-list__link" href={detailHref}>
        <div className="project-list__title">
          <h2>{rollup.project.name}</h2>
          <StatusPill tone={projectStatusTone(rollup.project.status)}>
            {projectStatusLabel(rollup.project.status)}
          </StatusPill>
        </div>
        {metadata && (
          <p className="project-list__client">
            Client · <strong>{metadata.client}</strong>
          </p>
        )}
        <dl className="project-list__metrics">
          <Metric label="Packages">{rollup.packageCount}</Metric>
          <Metric label="Active">{rollup.activePackageCount}</Metric>
          <Metric label="Completed">{rollup.completedPackageCount}</Metric>
          <Metric label="Total cap">
            <Money amount={rollup.totalCap} withSymbol />
          </Metric>
          <Metric label="Released">
            <Money amount={rollup.totalReleased} withSymbol />
          </Metric>
          <Metric label="Outstanding">
            <Money amount={rollup.totalOutstandingFunded} withSymbol />
          </Metric>
        </dl>
        {packagesWithActiveHeldRequest > 0 && (
          <p className="project-list__held">
            <StatusPill tone="warning">
              {packagesWithActiveHeldRequest} on hold
            </StatusPill>
          </p>
        )}
      </a>
    </li>
  );
};

const Metric = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="project-list__metric">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);
