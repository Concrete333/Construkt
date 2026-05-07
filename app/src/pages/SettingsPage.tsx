import { CONSTRUKT_PROGRAM_ID } from "../lib/config";
import { shortAddress } from "../lib/format";
import { DEMO_ROLE_LABEL, networkBadgeContent } from "../lib/theme";
import type { DemoRole, DemoNetwork, ThemeMode } from "../lib/theme";
import "./SettingsPage.css";

interface SettingsPageProps {
  role: DemoRole;
  theme: ThemeMode;
  network: DemoNetwork;
}

export const SettingsPage = ({ role, theme, network }: SettingsPageProps) => {
  const badge = networkBadgeContent(network);
  return (
    <section className="settings">
      <header className="settings__head">
        <h1>Settings</h1>
        <p className="settings__lead">
          V0 demo settings are read-only here. Use the header controls to switch
          role or theme.
        </p>
      </header>

      <div className="settings__groups">
        <SettingsGroup title="Demo session">
          <SettingsRow
            label="Active role"
            value={DEMO_ROLE_LABEL[role]}
            hint="Change via the role switcher in the header."
          />
          <SettingsRow
            label="Theme"
            value={theme === "light" ? "Light" : "Dark"}
            hint="Toggle via the sun/moon button in the header."
          />
        </SettingsGroup>

        <SettingsGroup title="Network">
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
        </SettingsGroup>

        <SettingsGroup title="Deferred (post-V0)">
          <DeferredItem label="Wallet connection" />
          <DeferredItem label="RPC endpoint override" />
          <DeferredItem label="Notification preferences" />
          <DeferredItem label="Document storage backend" />
        </SettingsGroup>
      </div>
    </section>
  );
};

const SettingsGroup = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="settings__group">
    <h2 className="settings__group-title">{title}</h2>
    <ul className="settings__rows">{children}</ul>
  </div>
);

const SettingsRow = ({
  label,
  value,
  hint,
  mono = false,
  copyValue,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  copyValue?: string;
}) => (
  <li className="settings__row">
    <span className="settings__row-label">{label}</span>
    <span className="settings__row-value-wrap">
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
      {hint && <span className="settings__row-hint">{hint}</span>}
    </span>
  </li>
);

const DeferredItem = ({ label }: { label: string }) => (
  <li className="settings__row settings__row--deferred">
    <span className="settings__row-label">{label}</span>
    <span className="settings__row-value settings__row-value--muted">
      Coming in a later phase
    </span>
  </li>
);
