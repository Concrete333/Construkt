import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  buildDemoClients,
  collapseSeededReviewProjects,
  walletForRole,
} from "./clients";
import type { Fetched, ProjectAccount } from "./program";
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

describe("collapseSeededReviewProjects", () => {
  it("keeps the canonical seeded project and hides stale localnet duplicates", async () => {
    const { client, world } = await buildDemoClients();
    const [canonical] = await client.fetchProjects();
    const stale: Fetched<ProjectAccount> = {
      address: Keypair.generate().publicKey,
      account: {
        ...canonical.account,
        projectId: 99n,
      },
    };

    const collapsed = collapseSeededReviewProjects(
      [stale, canonical],
      world.project,
    );

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].address.toBase58()).toBe(world.project.toBase58());
  });
});
