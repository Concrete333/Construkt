import { useEffect, useId, useRef, useState } from "react";
import { DEMO_ROLE_LABEL, DEMO_ROLES } from "../lib/theme";
import type { DemoRole } from "../lib/theme";
import "./RoleSwitcher.css";

export interface RoleSwitcherProps {
  role: DemoRole;
  onChange: (next: DemoRole) => void;
}

/**
 * Demo-only role switcher. Custom listbox (rather than a native
 * `<select>`) so the popup honors the app's design tokens — the OS-
 * native popup doesn't pick up our typography, surface colors, or dark
 * mode. The component still satisfies the listbox WAI-ARIA pattern:
 * arrow keys move highlight, Enter/Space commits, Escape cancels.
 *
 * This swaps the *visible* role across the surface (which projects and
 * tasks render) and is **not** signing authority. Per the plan's "Role
 * visibility is not authorization" rule, this control must stay clearly
 * labeled as demo behavior.
 */
export const RoleSwitcher = ({ role, onChange }: RoleSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<DemoRole>(role);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const listboxId = useId();

  // Close on outside click and on Escape (when open).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the listbox when it opens so arrow keys work immediately.
  // Highlight is reset by the trigger handler, not here, to avoid
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
  }, [open]);

  const move = (delta: 1 | -1) => {
    const idx = DEMO_ROLES.indexOf(highlight);
    const next = (idx + delta + DEMO_ROLES.length) % DEMO_ROLES.length;
    setHighlight(DEMO_ROLES[next]);
  };

  const commit = (next: DemoRole) => {
    if (next !== role) onChange(next);
    setOpen(false);
    rootRef.current?.querySelector("button")?.focus();
  };

  const onListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setHighlight(DEMO_ROLES[0]);
        break;
      case "End":
        e.preventDefault();
        setHighlight(DEMO_ROLES[DEMO_ROLES.length - 1]);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(highlight);
        break;
    }
  };

  return (
    <div className="role-switcher" data-role={role} ref={rootRef}>
      <button
        type="button"
        className="role-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!open) setHighlight(role);
          setOpen((o) => !o);
        }}
      >
        <span className="role-switcher__caption">Demo role</span>
        <span className="role-switcher__value">{DEMO_ROLE_LABEL[role]}</span>
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
      </button>
      {open && (
        <ul
          id={listboxId}
          ref={listRef}
          className="role-switcher__list"
          role="listbox"
          aria-label="Active demo role"
          aria-activedescendant={`${listboxId}-${highlight}`}
          tabIndex={-1}
          onKeyDown={onListKey}
        >
          {DEMO_ROLES.map((r) => (
            <li
              key={r}
              id={`${listboxId}-${r}`}
              role="option"
              aria-selected={r === role}
              data-highlight={r === highlight}
              className="role-switcher__option"
              onMouseEnter={() => setHighlight(r)}
              onMouseDown={(e) => {
                // Prevent the document mousedown handler from firing
                // first and closing the popup before our click commits.
                e.preventDefault();
                commit(r);
              }}
            >
              {DEMO_ROLE_LABEL[r]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
