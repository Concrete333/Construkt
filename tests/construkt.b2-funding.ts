import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  capAmount,
  createFixture,
  expectError,
  firstFundingAmount,
} from "./setup";

describe("construkt b2 funding", () => {
  const fx = createFixture();
  let packageAddresses: {
    workPackage: anchor.web3.PublicKey;
    vaultAuthority: anchor.web3.PublicKey;
    vault: anchor.web3.PublicKey;
  };

  before(async () => {
    await fx.init();
    await fx.initializeProject();
    packageAddresses = await fx.createWorkPackageForTest(1);
  });

  it("finance funds package vault", async () => {
    await fx.fundPackage(packageAddresses, firstFundingAmount);

    const workPackageAccount =
      await fx.program.account.workPackageAccount.fetch(
        packageAddresses.workPackage
      );
    assert.strictEqual(
      workPackageAccount.fundedAmount.toNumber(),
      firstFundingAmount.toNumber()
    );

    const vaultAccount = await getAccount(
      fx.provider.connection,
      packageAddresses.vault,
      fx.provider.opts.commitment,
      TOKEN_PROGRAM_ID
    );
    assert.strictEqual(
      Number(vaultAccount.amount),
      firstFundingAmount.toNumber()
    );
  });

  it("rejects invalid escrow funding inputs", async () => {
    const wrongMint = await createMint(
      fx.provider.connection,
      fx.finance,
      fx.finance.publicKey,
      null,
      6
    );
    const wrongMintTokenAccount = await createAssociatedTokenAccount(
      fx.provider.connection,
      fx.finance,
      wrongMint,
      fx.finance.publicKey
    );
    await mintTo(
      fx.provider.connection,
      fx.finance,
      wrongMint,
      wrongMintTokenAccount,
      fx.finance,
      1_000
    );

    await expectError(
      fx.program.methods
        .fundEscrow(new anchor.BN(1))
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          mint: fx.mint,
          financeTokenAccount: wrongMintTokenAccount,
          vault: packageAddresses.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "WrongMint"
    );

    const unrelatedTokenAccount = await createAssociatedTokenAccount(
      fx.provider.connection,
      fx.finance,
      fx.mint,
      fx.unrelatedUser.publicKey
    );
    await mintTo(
      fx.provider.connection,
      fx.finance,
      fx.mint,
      unrelatedTokenAccount,
      fx.finance,
      1_000
    );

    await expectError(
      fx.program.methods
        .fundEscrow(new anchor.BN(1))
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          mint: fx.mint,
          financeTokenAccount: unrelatedTokenAccount,
          vault: packageAddresses.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "WrongTokenOwner"
    );

    await expectError(
      fx.program.methods
        .fundEscrow(new anchor.BN(400_001))
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          mint: fx.mint,
          financeTokenAccount: fx.financeTokenAccount,
          vault: packageAddresses.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "InsufficientRemainingCap"
    );
  });

  it("rejects zero amount and non-finance escrow funding", async () => {
    await expectError(
      fx.program.methods
        .fundEscrow(new anchor.BN(0))
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          mint: fx.mint,
          financeTokenAccount: fx.financeTokenAccount,
          vault: packageAddresses.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "InvalidAmount"
    );

    const nonFinance = anchor.web3.Keypair.generate();
    const nonFinanceTokenAccount = await createAssociatedTokenAccount(
      fx.provider.connection,
      fx.finance,
      fx.mint,
      nonFinance.publicKey
    );
    await mintTo(
      fx.provider.connection,
      fx.finance,
      fx.mint,
      nonFinanceTokenAccount,
      fx.finance,
      1_000
    );

    await expectError(
      fx.program.methods
        .fundEscrow(new anchor.BN(1))
        .accounts({
          authority: nonFinance.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          mint: fx.mint,
          financeTokenAccount: nonFinanceTokenAccount,
          vault: packageAddresses.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([nonFinance])
        .rpc(),
      "Unauthorized"
    );
  });

  it("allows funding exactly to package cap", async () => {
    const exactCapPackage = await fx.createWorkPackageForTest(10);

    await fx.fundPackage(exactCapPackage, capAmount);

    const workPackageAccount =
      await fx.program.account.workPackageAccount.fetch(
        exactCapPackage.workPackage
      );
    assert.strictEqual(
      workPackageAccount.fundedAmount.toNumber(),
      capAmount.toNumber()
    );

    const vaultAccount = await getAccount(
      fx.provider.connection,
      exactCapPackage.vault,
      fx.provider.opts.commitment,
      TOKEN_PROGRAM_ID
    );
    assert.strictEqual(Number(vaultAccount.amount), capAmount.toNumber());
  });

  it("accumulates multiple escrow fundings", async () => {
    const multiFundingPackage = await fx.createWorkPackageForTest(11);
    const depositAmount = new anchor.BN(100_000);

    await fx.fundPackage(multiFundingPackage, depositAmount);
    await fx.fundPackage(multiFundingPackage, depositAmount);

    const workPackageAccount =
      await fx.program.account.workPackageAccount.fetch(
        multiFundingPackage.workPackage
      );
    assert.strictEqual(workPackageAccount.fundedAmount.toNumber(), 200_000);

    const vaultAccount = await getAccount(
      fx.provider.connection,
      multiFundingPackage.vault,
      fx.provider.opts.commitment,
      TOKEN_PROGRAM_ID
    );
    assert.strictEqual(Number(vaultAccount.amount), 200_000);
  });
});
