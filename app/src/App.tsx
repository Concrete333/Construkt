import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppShell } from "./components/AppShell";
import { ClientsProvider } from "./components/ClientsProvider";
import { useClients } from "./components/clientsContext";
import { Dashboard2Page } from "./pages/Dashboard2Page";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { SignInPage } from "./pages/SignInPage";
import { WorkPackageViewPage } from "./pages/WorkPackageViewPage";
import { applyTheme, nextTheme } from "./lib/theme";
import { useHashRoute } from "./lib/router";
import { walletForRole } from "./lib/clients";
import type { ParsedRoute } from "./lib/router";
import type { DemoNetwork, DemoRole, ThemeMode } from "./lib/theme";
import "./App.css";

const App = () => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [network] = useState<DemoNetwork>("localnet");
  const [role, setRole] = useState<DemoRole>("financeDirector");
  const route = useHashRoute();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const headerCommon = {
    network,
    role,
    onChangeRole: setRole,
    theme,
    onToggleTheme: () => setTheme((t) => nextTheme(t)),
  };

  return (
    <ClientsProvider
      fallback={
        <AppShell header={{ ...headerCommon, wallet: null }}>
          <DemoSeedingNotice />
        </AppShell>
      }
    >
      <SeededShell headerCommon={headerCommon}>
        <RouteSwitch route={route} role={role} onSelectRole={setRole} />
      </SeededShell>
    </ClientsProvider>
  );
};

interface SeededShellProps {
  headerCommon: Omit<React.ComponentProps<typeof AppShell>["header"], "wallet">;
  children: ReactNode;
}

const SeededShell = ({ headerCommon, children }: SeededShellProps) => {
  const { world } = useClients();
  const wallet = walletForRole(world, headerCommon.role);
  return <AppShell header={{ ...headerCommon, wallet }}>{children}</AppShell>;
};

const RouteSwitch = ({
  route,
  role,
  onSelectRole,
}: {
  route: ParsedRoute;
  role: DemoRole;
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
      return <ProjectDetailPage address={route.params.address} />;
    case "workPackageView":
      return <WorkPackageViewPage address={route.params.address} role={role} />;
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
      <a className="home-placeholder__button" href="#signin">
        Sign in to demo
      </a>
    </div>
  </section>
);

const DemoSeedingNotice = () => (
  <div className="home-placeholder__loading">Seeding demo data…</div>
);

export default App;
