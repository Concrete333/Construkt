import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import type { AppHeaderProps } from "./AppHeader";
import "./AppShell.css";

export interface AppShellProps {
  header: AppHeaderProps;
  children: ReactNode;
}

export const AppShell = ({ header, children }: AppShellProps) => (
  <div className="app-shell">
    <AppHeader {...header} />
    <main className="app-shell__main">{children}</main>
  </div>
);
