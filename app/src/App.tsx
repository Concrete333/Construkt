import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ClientsProvider } from "./components/ClientsProvider";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { WorkPackageViewPage } from "./pages/WorkPackageViewPage";
import { applyTheme, nextTheme } from "./lib/theme";
import { useHashRoute } from "./lib/router";
import type { ParsedRoute } from "./lib/router";
import type { DemoNetwork, DemoRole, ThemeMode } from "./lib/theme";
import "./App.css";

const App = () => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [network] = useState<DemoNetwork>("localnet");
  const [role] = useState<DemoRole>("financeDirector");
  const route = useHashRoute();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <AppShell
      header={{
        network,
        role,
        theme,
        onToggleTheme: () => setTheme((t) => nextTheme(t)),
      }}
    >
      <ClientsProvider fallback={<DemoSeedingNotice />}>
        <RouteSwitch route={route} role={role} />
      </ClientsProvider>
    </AppShell>
  );
};

const RouteSwitch = ({
  route,
  role,
}: {
  route: ParsedRoute;
  role: DemoRole;
}) => {
  switch (route.key) {
    case "projects":
      return <ProjectListPage role={role} />;
    case "projectDetail":
      return <ProjectDetailPage address={route.params.address} />;
    case "workPackageView":
      return <WorkPackageViewPage address={route.params.address} />;
    case "home":
    default:
      return <HomePlaceholder />;
  }
};

const HomePlaceholder = () => (
  <section className="home-placeholder">
    <p className="home-placeholder__eyebrow">Construction payment control</p>
    <h1>Clean approvals for work-package payments.</h1>
    <p className="home-placeholder__lead">
      Construkt keeps finance, site teams, and contractors aligned on package
      funding, request status, approval progress, and release readiness. The
      integrated app shell is in place; project, dashboard, and work-package
      surfaces land in the next steps.
    </p>
    <div className="home-placeholder__cta">
      <a className="home-placeholder__button" href="#projects">
        Browse projects
      </a>
    </div>
  </section>
);

const DemoSeedingNotice = () => (
  <div className="home-placeholder__loading">Seeding demo data…</div>
);

export default App;
