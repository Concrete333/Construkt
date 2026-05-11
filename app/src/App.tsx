import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ClientsProvider } from "./components/ClientsProvider";
import { Dashboard2Page } from "./pages/Dashboard2Page";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SignInPage } from "./pages/SignInPage";
import { WorkPackageViewPage } from "./pages/WorkPackageViewPage";
import { buildAnchorClients, buildDemoClients } from "./lib/clients";
import { applyTheme, nextTheme } from "./lib/theme";
import { useHashRoute } from "./lib/router";
import type { ParsedRoute } from "./lib/router";
import type { DemoNetwork, DemoRole, ThemeMode } from "./lib/theme";
import "./App.css";

const App = () => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [role, setRole] = useState<DemoRole>("financeDirector");
  const route = useHashRoute();
  const rpc = import.meta.env.VITE_ANCHOR_RPC as string | undefined;
  const network: DemoNetwork = rpc
    ? rpc.toLowerCase().includes("devnet")
      ? "devnet"
      : "localnet"
    : "mock";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const buildClients = useCallback(
    () => (rpc ? buildAnchorClients(rpc) : buildDemoClients()),
    [rpc],
  );

  const headerCommon = {
    network,
    role,
    onChangeRole: setRole,
    theme,
    onToggleTheme: () => setTheme((t) => nextTheme(t)),
    route: route.key,
  };

  return (
    <ClientsProvider
      buildClients={buildClients}
      fallback={
        <AppShell header={headerCommon}>
          <DemoSeedingNotice />
        </AppShell>
      }
    >
      <AppShell header={headerCommon}>
        <RouteSwitch
          route={route}
          role={role}
          theme={theme}
          network={network}
          onSelectRole={setRole}
        />
      </AppShell>
    </ClientsProvider>
  );
};

const RouteSwitch = ({
  route,
  role,
  theme,
  network,
  onSelectRole,
}: {
  route: ParsedRoute;
  role: DemoRole;
  theme: ThemeMode;
  network: DemoNetwork;
  onSelectRole: (role: DemoRole) => void;
}) => {
  switch (route.key) {
    case "signin":
      return <SignInPage onSelectRole={onSelectRole} />;
    case "dashboard2":
      return <Dashboard2Page role={role} />;
    case "projects":
      return <ProjectListPage role={role} />;
    case "projectDetail":
      return <ProjectDetailPage address={route.params.address} role={role} />;
    case "workPackageView":
      return <WorkPackageViewPage address={route.params.address} role={role} />;
    case "settings":
      return <SettingsPage role={role} theme={theme} network={network} />;
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
      funding, request status, approval progress, and release readiness. Use the
      dashboard for the walkthrough or open projects to create and manage
      packages.
    </p>
    <div className="home-placeholder__cta">
      <a className="home-placeholder__button" href="#signin">
        Choose role
      </a>
      <a className="home-placeholder__button" href="#dashboard2">
        Open dashboard
      </a>
    </div>
  </section>
);

const DemoSeedingNotice = () => (
  <div className="home-placeholder__loading">Preparing review state...</div>
);

export default App;
