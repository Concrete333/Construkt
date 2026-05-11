import { NetworkBadge } from "./NetworkBadge";
import { RoleSwitcher } from "./RoleSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import type { ReactNode } from "react";
import type { RouteKey } from "../lib/router";
import type { DemoNetwork, DemoRole, ThemeMode } from "../lib/theme";
import "./AppHeader.css";

export interface AppHeaderProps {
  network: DemoNetwork;
  role: DemoRole;
  onChangeRole: (next: DemoRole) => void;
  route: RouteKey;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const isProjectsNavActive = (route: RouteKey): boolean =>
  route === "projects" ||
  route === "projectDetail" ||
  route === "workPackageView";

export const AppHeader = ({
  network,
  role,
  onChangeRole,
  route,
  theme,
  onToggleTheme,
}: AppHeaderProps) => (
  <header className="app-header" aria-label="Application navigation">
    <a
      className="app-header__logo"
      href="#dashboard2"
      aria-label="Construkt dashboard"
    >
      <span className="app-header__logo-picture" aria-hidden="true">
        <img
          className="app-header__logo-mark app-header__logo-mark--light"
          src="/static/projects/img/construkt-logo-mark.png"
          alt=""
        />
        <img
          className="app-header__logo-mark app-header__logo-mark--dark"
          src="/static/projects/img/construkt-logo-mark-dark.png"
          alt=""
        />
      </span>
      <span className="app-header__wordmark">Construkt</span>
    </a>
    <nav className="app-header__tabs" aria-label="Primary">
      <HeaderTab active={route === "home"} href="#home" label="Home">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </HeaderTab>
      <HeaderTab
        active={route === "dashboard2"}
        href="#dashboard2"
        label="Dashboard"
      >
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </HeaderTab>
      <HeaderTab
        active={isProjectsNavActive(route)}
        href="#projects"
        label="Projects"
      >
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </HeaderTab>
      <HeaderTab
        active={route === "settings"}
        href="#settings"
        label="Settings"
      >
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.09.09a2 2 0 1 1-3.82 0L10 20a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.09-.09a2 2 0 1 1 0-3.82L4 10a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.09-.09a2 2 0 1 1 3.82 0L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.07.37.27.7.6 1l.09.09a2 2 0 1 1 0 3.82L20 14a1.7 1.7 0 0 0-.6 1Z" />
      </HeaderTab>
    </nav>
    <div className="app-header__right">
      <NetworkBadge network={network} />
      <RoleSwitcher role={role} onChange={onChangeRole} />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </div>
  </header>
);

interface HeaderTabProps {
  active: boolean;
  href: string;
  label: string;
  children: ReactNode;
}

const HeaderTab = ({ active, href, label, children }: HeaderTabProps) => (
  <a
    className={`app-header__tab ${active ? "is-active" : ""}`}
    href={href}
    aria-label={label}
    aria-current={active ? "page" : undefined}
  >
    <svg
      className="app-header__tab-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
    <span className="app-header__tab-label">{label}</span>
  </a>
);
