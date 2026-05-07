import type { ThemeMode } from "../lib/theme";
import "./ThemeToggle.css";

export interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

export const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => (
  <button
    type="button"
    className="theme-toggle"
    onClick={onToggle}
    aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {theme === "light" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
          <path d="M5.6 5.6l1.4 1.4" />
          <path d="M17 17l1.4 1.4" />
          <path d="M5.6 18.4l1.4-1.4" />
          <path d="M17 7l1.4-1.4" />
        </>
      ) : (
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      )}
    </svg>
  </button>
);
