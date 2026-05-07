import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { applyTheme, nextTheme } from "./lib/theme";
import type { DemoNetwork, DemoRole, ThemeMode } from "./lib/theme";
import "./App.css";

const App = () => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [network] = useState<DemoNetwork>("localnet");
  const [role] = useState<DemoRole>("financeDirector");

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
      <section className="home-placeholder">
        <p className="home-placeholder__eyebrow">
          Construction payment control
        </p>
        <h1>Clean approvals for work-package payments.</h1>
        <p className="home-placeholder__lead">
          Construkt keeps finance, site teams, and contractors aligned on
          package funding, request status, approval progress, and release
          readiness. The integrated app shell is in place; project, dashboard,
          and work-package surfaces land in the next steps.
        </p>
      </section>
    </AppShell>
  );
};

export default App;
