import { useState } from "react";
import type { ReactNode } from "react";
import { CONSTRUKT_PROGRAM_ID } from "../lib/config";
import { shortAddress } from "../lib/format";
import { DEMO_ROLE_LABEL, networkBadgeContent } from "../lib/theme";
import type { DemoNetwork, DemoRole, ThemeMode } from "../lib/theme";
import "./SettingsPage.css";

interface SettingsPageProps {
  role: DemoRole;
  theme: ThemeMode;
  network: DemoNetwork;
}

type SettingsTab = "profile" | "roles" | "network" | "notifications";

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "roles", label: "Roles & Access" },
  { id: "network", label: "Network" },
  { id: "notifications", label: "Notifications" },
];

const PROFILE_NAME: Record<DemoRole, string> = {
  financeDirector: "Maya Shah",
  projectManager: "Eleanor Lane",
  contractor: "Daniel Okafor",
  director: "Amelia Hughes",
};

const ROLE_ORG: Record<DemoRole, string> = {
  financeDirector: "Northstar Health Trust",
  projectManager: "Northstar Projects",
  contractor: "Okafor Builders Ltd.",
  director: "Northstar Capital Board",
};

const modeLabel = (network: DemoNetwork): string => {
  switch (network) {
    case "mock":
      return "Seeded review";
    case "localnet":
      return "Anchor localnet";
    case "devnet":
      return "Anchor devnet";
  }
};

export const SettingsPage = ({ role, theme, network }: SettingsPageProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [notificationPrefs, setNotificationPrefs] = useState({
    approvals: true,
    documents: true,
    escrow: true,
  });
  const badge = networkBadgeContent(network);
  const toggleNotification = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs((prefs) => ({ ...prefs, [key]: !prefs[key] }));
  };

  return (
    <section className="settings">
      <header className="settings__head">
        <p className="settings__breadcrumb">Settings</p>
        <h1>Account settings</h1>
        <p className="settings__lead">
          Profile, role access, and network connection state.
        </p>
      </header>

      <div className="settings__layout">
        <nav className="settings__tabs" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settings__tab ${
                activeTab === tab.id ? "is-active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="settings__content">
          {activeTab === "profile" && (
            <SettingsCard title="Profile">
              <div className="settings__profile-grid">
                <ReadonlyField label="Name" value={PROFILE_NAME[role]} />
                <ReadonlyField label="Role" value={DEMO_ROLE_LABEL[role]} />
                <ReadonlyField label="Organisation" value={ROLE_ORG[role]} />
                <ReadonlyField
                  label="Theme"
                  value={theme === "light" ? "Light" : "Dark"}
                />
              </div>
              <p className="settings__note">
                Role and organisation details are managed by the client
                workspace in production.
              </p>
            </SettingsCard>
          )}

          {activeTab === "roles" && (
            <SettingsCard title="Roles & Access">
              <ul className="settings__list">
                <AccessRow
                  label="Finance Director"
                  active={role === "financeDirector"}
                  detail="Create projects, approve escrow, release funds, assign package roles."
                />
                <AccessRow
                  label="Project Manager"
                  active={role === "projectManager"}
                  detail="Create estimated packages, submit drafts, review contractor evidence."
                />
                <AccessRow
                  label="Contractor"
                  active={role === "contractor"}
                  detail="View assigned packages, submit milestone invoices, clear withdrawals."
                />
                <AccessRow
                  label="Director"
                  active={role === "director"}
                  detail="Optional high approval step for clients that require extra release control."
                />
              </ul>
            </SettingsCard>
          )}

          {activeTab === "network" && (
            <SettingsCard title="Network">
              <SettingsRow label="Network" value={badge.label} />
              <SettingsRow
                label="Program ID"
                value={shortAddress(CONSTRUKT_PROGRAM_ID.toBase58(), {
                  head: 8,
                  tail: 8,
                })}
                mono
                copyValue={CONSTRUKT_PROGRAM_ID.toBase58()}
              />
              <SettingsRow label="Mode" value={modeLabel(network)} />
            </SettingsCard>
          )}

          {activeTab === "notifications" && (
            <SettingsCard title="Notifications">
              <ul className="settings__list">
                <NotificationPreference
                  label="Approval and release alerts"
                  detail="Notify the right approver when a request is ready for review or release."
                  active={notificationPrefs.approvals}
                  onToggle={() => toggleNotification("approvals")}
                />
                <NotificationPreference
                  label="Document request reminders"
                  detail="Flag evidence requests and reference updates on active packages."
                  active={notificationPrefs.documents}
                  onToggle={() => toggleNotification("documents")}
                />
                <NotificationPreference
                  label="Escrow status changes"
                  detail="Track funding, holds, releases, and contractor withdrawal availability."
                  active={notificationPrefs.escrow}
                  onToggle={() => toggleNotification("escrow")}
                />
              </ul>
            </SettingsCard>
          )}
        </div>
      </div>
    </section>
  );
};

const SettingsCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="settings__card">
    <h2>{title}</h2>
    {children}
  </section>
);

const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
  <label className="settings__field">
    <span>{label}</span>
    <input value={value} readOnly />
  </label>
);

const SettingsRow = ({
  label,
  value,
  mono = false,
  copyValue,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string;
}) => (
  <div className="settings__row">
    <span className="settings__row-label">{label}</span>
    <span
      className={
        mono
          ? "settings__row-value settings__row-value--mono"
          : "settings__row-value"
      }
      title={copyValue}
    >
      {value}
    </span>
  </div>
);

const AccessRow = ({
  label,
  detail,
  active,
}: {
  label: string;
  detail: string;
  active: boolean;
}) => (
  <li className="settings__access-row">
    <div>
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
    <span className={`settings__access-pill ${active ? "is-active" : ""}`}>
      {active ? "Current" : "Available"}
    </span>
  </li>
);

const NotificationPreference = ({
  label,
  detail,
  active,
  onToggle,
}: {
  label: string;
  detail: string;
  active: boolean;
  onToggle: () => void;
}) => (
  <li className="settings__access-row">
    <div>
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
    <button
      type="button"
      className={`settings__toggle ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onToggle}
    >
      {active ? "On" : "Off"}
    </button>
  </li>
);
