import { describe, expect, it } from "vitest";
import { buildDemoClients, walletForRole } from "./clients";
import { DEMO_ROLES } from "./theme";

describe("walletForRole", () => {
  it("maps each demo role to a distinct seeded demo wallet", async () => {
    const { world } = await buildDemoClients();
    const seen = new Set<string>();
    for (const role of DEMO_ROLES) {
      const wallet = walletForRole(world, role);
      seen.add(wallet.toBase58());
    }
    expect(seen.size).toBe(DEMO_ROLES.length);
  });

  it("returns the finance keypair for financeDirector", async () => {
    const { world } = await buildDemoClients();
    expect(walletForRole(world, "financeDirector").toBase58()).toBe(
      world.finance.publicKey.toBase58(),
    );
  });

  it("returns the contractor keypair for contractor", async () => {
    const { world } = await buildDemoClients();
    expect(walletForRole(world, "contractor").toBase58()).toBe(
      world.contractor.publicKey.toBase58(),
    );
  });
});
