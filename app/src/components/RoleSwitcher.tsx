import { DEMO_ROLE_LABEL, DEMO_ROLES } from "../lib/theme";
import type { DemoRole } from "../lib/theme";
import "./RoleSwitcher.css";

export interface RoleSwitcherProps {
  role: DemoRole;
  onChange: (next: DemoRole) => void;
}

/**
 * Demo-only role switcher. This swaps the *visible* role across the
 * surface (which projects and tasks render) and is **not** signing
 * authority — that comes from the connected wallet in Phase 4. Per the
 * plan's "Role visibility is not authorization" rule, this control must
 * stay clearly labeled as demo behaviour.
 */
export const RoleSwitcher = ({ role, onChange }: RoleSwitcherProps) => (
  <label className="role-switcher" data-role={role}>
    <span className="role-switcher__caption">Demo role</span>
    <select
      className="role-switcher__select"
      value={role}
      onChange={(e) => onChange(e.target.value as DemoRole)}
      aria-label="Active demo role"
    >
      {DEMO_ROLES.map((r) => (
        <option key={r} value={r}>
          {DEMO_ROLE_LABEL[r]}
        </option>
      ))}
    </select>
    <svg
      className="role-switcher__caret"
      viewBox="0 0 12 12"
      width="10"
      height="10"
      aria-hidden="true"
    >
      <path
        d="M2 4l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  </label>
);
