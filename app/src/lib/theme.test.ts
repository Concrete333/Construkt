import { describe, expect, it } from "vitest";
import { DEMO_ROLE_LABEL, networkBadgeContent, nextTheme } from "./theme";

describe("nextTheme", () => {
  it("flips light to dark and back", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});

describe("networkBadgeContent", () => {
  it("formats localnet as LOCALNET · MOCK USDC", () => {
    expect(networkBadgeContent("localnet")).toEqual({
      network: "localnet",
      label: "LOCALNET · MOCK USDC",
    });
  });

  it("formats devnet as DEVNET · MOCK USDC", () => {
    expect(networkBadgeContent("devnet").label).toBe("DEVNET · MOCK USDC");
  });

  it("never claims mainnet", () => {
    for (const net of ["localnet", "devnet"] as const) {
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
