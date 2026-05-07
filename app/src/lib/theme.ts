export type ThemeMode = "light" | "dark";

export const nextTheme = (current: ThemeMode): ThemeMode =>
  current === "light" ? "dark" : "light";

/**
 * Toggle the document theme attribute. Pure-DOM side effect kept here so
 * components don't sprinkle `document.documentElement.dataset.theme`
 * mutations.
 */
export const applyTheme = (theme: ThemeMode): void => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
};

export type DemoNetwork = "localnet" | "devnet";

export interface NetworkBadgeContent {
  network: DemoNetwork;
  label: string;
}

const NETWORK_LABEL: Record<DemoNetwork, string> = {
  localnet: "LOCALNET",
  devnet: "DEVNET",
};

/**
 * The integrated app must never claim mainnet — escrowed funds are mock
 * USDC against a localnet/devnet program. The badge format makes that
 * unambiguous so demo screenshots can never be mistaken for production.
 */
export const networkBadgeContent = (
  network: DemoNetwork,
): NetworkBadgeContent => ({
  network,
  label: `${NETWORK_LABEL[network]} · MOCK USDC`,
});

export type DemoRole =
  | "financeDirector"
  | "projectManager"
  | "director"
  | "contractor";

export const DEMO_ROLE_LABEL: Record<DemoRole, string> = {
  financeDirector: "Finance Director",
  projectManager: "Project Manager",
  director: "Director",
  contractor: "Contractor",
};

/**
 * Iteration order for the role switcher. Finance first because it's the
 * default landing role and the most frequently demoed surface.
 */
export const DEMO_ROLES: readonly DemoRole[] = [
  "financeDirector",
  "projectManager",
  "director",
  "contractor",
] as const;
