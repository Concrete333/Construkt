import { useEffect, useState } from "react";

/**
 * Hash routes mirror the prototype's surface so deep links and sharing
 * land on the same screens both build artefacts target. Legacy aliases
 * (`#dashboard`, `#work-package-detail`) keep prototype URLs valid in
 * the integrated app per Step 5.
 */
export type RouteKey =
  | "home"
  | "signin"
  | "dashboard2"
  | "projects"
  | "projectDetail"
  | "workPackageView"
  | "settings";

export interface ParsedRoute {
  key: RouteKey;
  params: Record<string, string>;
  /** Original raw hash (without the leading `#`). Useful for diagnostics. */
  raw: string;
}

const PATH_TO_KEY: Record<string, RouteKey> = {
  home: "home",
  "": "dashboard2",
  signin: "signin",
  dashboard: "dashboard2",
  dashboard2: "dashboard2",
  projects: "projects",
  "project-detail": "projectDetail",
  "work-package-detail": "workPackageView",
  "work-package-view": "workPackageView",
  settings: "settings",
};

export const parseHash = (rawHash: string): ParsedRoute => {
  const trimmed = rawHash.replace(/^#/, "");
  const [path, query = ""] = trimmed.split("?");
  const params: Record<string, string> = {};
  for (const pair of query.split("&").filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq === -1) {
      params[decodeURIComponent(pair)] = "";
    } else {
      params[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(
        pair.slice(eq + 1),
      );
    }
  }
  return {
    key: PATH_TO_KEY[path] ?? "home",
    params,
    raw: trimmed,
  };
};

export const buildHash = (
  key: Exclude<RouteKey, "home">,
  params: Record<string, string> = {},
): string => {
  const path = PATH_TO_PATH[key];
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return query ? `#${path}?${query}` : `#${path}`;
};

const PATH_TO_PATH: Record<Exclude<RouteKey, "home">, string> = {
  signin: "signin",
  dashboard2: "dashboard2",
  projects: "projects",
  projectDetail: "project-detail",
  workPackageView: "work-package-view",
  settings: "settings",
};

/**
 * React hook subscribing to the browser hash. Returns the parsed route
 * so consumers can switch on `key` without re-running `parseHash`.
 * SSR-safe: when `window` is unavailable the hook returns the dashboard.
 */
export const useHashRoute = (): ParsedRoute => {
  const [route, setRoute] = useState<ParsedRoute>(() =>
    parseHash(typeof window !== "undefined" ? window.location.hash : ""),
  );
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
};
