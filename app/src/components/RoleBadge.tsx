import { DEMO_ROLE_LABEL } from "../lib/theme";
import type { DemoRole } from "../lib/theme";
import "./RoleBadge.css";

export interface RoleBadgeProps {
  role: DemoRole;
}

/**
 * Display-only badge for the active demo role. Step 8 makes this
 * interactive (`RoleSwitcher`) once the role state is wired through the
 * app and tied to filtered data. Until then this is read-only so we
 * don't ship a half-working role-change UI.
 */
export const RoleBadge = ({ role }: RoleBadgeProps) => (
  <span className="role-badge" data-role={role}>
    {DEMO_ROLE_LABEL[role]}
  </span>
);
