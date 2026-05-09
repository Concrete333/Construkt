import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { capAmount, createFixture, expectError } from "./setup";

describe("construkt b5 project budget and mint controls", () => {
  const projectBudget = new anchor.BN(3_000_000);

  const setupFreshProject = async () => {
    const fx = createFixture();
    await fx.init();
    await fx.initializeProject(
      "Demo Hospital Fit-Out",
      "ipfs://project-metadata",
      projectBudget
    );
    return fx;
  };

  it("rejects work package creation when the package mint differs from the project mint", async () => {
    const fx = await setupFreshProject();
    const wrongMint = await createMint(
      fx.provider.connection,
      fx.finance,
      fx.finance.publicKey,
      null,
      6
    );
    const addresses = fx.deriveWorkPackageAddresses(90);
    const wrongMintVault = getAssociatedTokenAddressSync(
      wrongMint,
      addresses.vaultAuthority,
      true
    );

    await expectError(
      fx.program.methods
        .createWorkPackage(
          new anchor.BN(90),
          capAmount,
          fx.contractor.publicKey,
          "ipfs://wrong-mint-scope"
        )
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: addresses.workPackage,
          vaultAuthority: addresses.vaultAuthority,
          mint: wrongMint,
          vault: wrongMintVault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "WrongMint"
    );
  });

  it("emits budget context in the WorkPackageCreated event payload", async () => {
    const fx = await setupFreshProject();
    const addresses = fx.deriveWorkPackageAddresses(89);
    const simulation = await fx.program.methods
      .createWorkPackage(
        new anchor.BN(89),
        capAmount,
        fx.contractor.publicKey,
        "ipfs://event-scope"
      )
      .accountsStrict({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage: addresses.workPackage,
        vaultAuthority: addresses.vaultAuthority,
        mint: fx.mint,
        vault: addresses.vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .simulate();

    const eventEntry = simulation.events.find(
      (entry) => entry.name === "workPackageCreated"
    );
    if (!eventEntry) {
      throw new Error(
        "workPackageCreated event was not emitted during simulation"
      );
    }
    const event = eventEntry.data;
    assert.strictEqual(event.packageId.toNumber(), 89);
    assert.strictEqual(
      event.projectBudgetAmount.toNumber(),
      projectBudget.toNumber()
    );
    assert.strictEqual(
      event.projectAllocatedAmount.toNumber(),
      capAmount.toNumber()
    );
  });

  it("tracks allocated package budget as packages are created", async () => {
    const fx = await setupFreshProject();

    const packageOne = await fx.createWorkPackageForTest(91);
    const projectAfterOne = await fx.program.account.projectAccount.fetch(
      fx.project
    );
    assert.strictEqual(
      projectAfterOne.allocatedAmount.toNumber(),
      capAmount.toNumber()
    );

    await fx.createWorkPackageForTest(92);
    const projectAfterTwo = await fx.program.account.projectAccount.fetch(
      fx.project
    );
    assert.strictEqual(
      projectAfterTwo.allocatedAmount.toNumber(),
      capAmount.toNumber() * 2
    );

    const wpOne = await fx.program.account.workPackageAccount.fetch(
      packageOne.workPackage
    );
    assert.ok(wpOne.mint.equals(fx.mint));
  });

  it("allows a package cap exactly equal to the full project budget", async () => {
    const fx = await setupFreshProject();

    await fx.createWorkPackageForTest(
      93,
      fx.contractor.publicKey,
      projectBudget
    );

    const projectAtBudget = await fx.program.account.projectAccount.fetch(
      fx.project
    );
    assert.strictEqual(
      projectAtBudget.allocatedAmount.toNumber(),
      projectBudget.toNumber()
    );
  });

  it("rejects package caps beyond the remaining project budget", async () => {
    const fx = await setupFreshProject();
    await fx.createWorkPackageForTest(
      94,
      fx.contractor.publicKey,
      new anchor.BN(2_500_000)
    );

    const overBudget = fx.deriveWorkPackageAddresses(95);
    await expectError(
      fx.program.methods
        .createWorkPackage(
          new anchor.BN(95),
          new anchor.BN(600_000),
          fx.contractor.publicKey,
          "ipfs://over-budget-scope"
        )
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: overBudget.workPackage,
          vaultAuthority: overBudget.vaultAuthority,
          mint: fx.mint,
          vault: overBudget.vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InsufficientRemainingCap"
    );
  });
});
