import { useEffect, useState } from "react";
import { useClients } from "../components/clientsContext";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { buildHash } from "../lib/router";
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
  const { client, metadata, world } = useClients();
  const [loaded, setLoaded] = useState<LoadedProject[] | null>(null);

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
  }, [client, metadata, world, role]);

  if (loaded === null) {
    return <div className="project-list__empty">Loading projects…</div>;
  }

  if (loaded.length === 0) {
    return (
      <div className="project-list__empty">
        {role === "contractor"
          ? "No projects assigned to this wallet yet."
          : "No projects yet."}
      </div>
    );
  }

  return (
    <section className="project-list">
      <header className="project-list__head">
        <h1>Projects</h1>
        <p className="project-list__lead">
          {role === "contractor"
            ? "Projects with at least one work package assigned to you."
            : "All active projects under your authority."}
        </p>
      </header>

      <ul className="project-list__items">
        {loaded.map((entry) => (
          <ProjectListItem
            key={entry.rollup.address.toBase58()}
            entry={entry}
          />
        ))}
      </ul>
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
