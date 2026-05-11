import { describe, expect, it } from "vitest";
import {
  DEMO_ROLE_LABEL,
  DEMO_ROLES,
  networkBadgeContent,
  nextTheme,
} from "./theme";

describe("nextTheme", () => {
  it("flips light to dark and back", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});

describe("networkBadgeContent", () => {
  it("formats mock mode clearly for hosted or no-RPC review", () => {
    expect(networkBadgeContent("mock")).toEqual({
      network: "mock",
      label: "SEEDED REVIEW",
    });
  });

  it("formats localnet like the prototype app badge", () => {
    expect(networkBadgeContent("localnet")).toEqual({
      network: "localnet",
      label: "SOLANA LOCALNET",
    });
  });

  it("formats devnet like the prototype app badge", () => {
    expect(networkBadgeContent("devnet").label).toBe("SOLANA DEVNET");
  });

  it("never claims mainnet", () => {
    for (const net of ["mock", "localnet", "devnet"] as const) {
      expect(networkBadgeContent(net).label).not.toMatch(/mainnet/i);
    }
  });
});

describe("DEMO_ROLE_LABEL", () => {
  it("provides a label for every demo role", () => {
    expect(DEMO_ROLE_LABEL.financeDirector).toBe("Finance Director");
    expect(DEMO_ROLE_LABEL.projectManager).toBe("Project Manager");
    expect(DEMO_ROLE_LABEL.director).toBe("Director");
    expect(DEMO_ROLE_LABEL.contractor).toBe("Contractor");
  });
});

describe("DEMO_ROLES", () => {
  it("lists Finance first so it's the default landing role", () => {
    expect(DEMO_ROLES[0]).toBe("financeDirector");
  });

  it("covers exactly the four DemoRole values", () => {
    expect([...DEMO_ROLES].sort()).toEqual(Object.keys(DEMO_ROLE_LABEL).sort());
  });

  it("has a label for every entry", () => {
    for (const role of DEMO_ROLES) {
      expect(DEMO_ROLE_LABEL[role]).toBeTruthy();
    }
  });
});
