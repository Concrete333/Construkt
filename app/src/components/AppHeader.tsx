import { NetworkBadge } from "./NetworkBadge";
import { RoleBadge } from "./RoleBadge";
import { ThemeToggle } from "./ThemeToggle";
import type { DemoNetwork, DemoRole, ThemeMode } from "../lib/theme";
import "./AppHeader.css";

export interface AppHeaderProps {
  network: DemoNetwork;
  role: DemoRole;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const AppHeader = ({
  network,
  role,
  theme,
  onToggleTheme,
}: AppHeaderProps) => (
  <header className="app-header">
    <a className="app-header__logo" href="#home" aria-label="Construkt home">
      <svg className="app-header__mark" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M10 7h14"></path>
        <path d="M10 25h14"></path>
        <path d="M10 7v18"></path>
      </svg>
      <span className="app-header__wordmark">Construkt</span>
    </a>
    <div className="app-header__right">
      <NetworkBadge network={network} />
      <RoleBadge role={role} />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </div>
  </header>
);
