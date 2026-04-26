import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createFixture, defaultPubkey, expectError, roleSeed } from "./setup";

describe("construkt b4 holds and release", () => {
  const fx = createFixture();
  let nextPackageId = 100;

  type PackageAddresses = {
    workPackage: anchor.web3.PublicKey;
    vaultAuthority: anchor.web3.PublicKey;
    vault: anchor.web3.PublicKey;
  };

  type PreparedRequest = {
    packageAddresses: PackageAddresses;
    paymentRequest: anchor.web3.PublicKey;
    contractorRoleAssignment: anchor.web3.PublicKey;
    pmRoleAssignment: anchor.web3.PublicKey;
    directorRoleAssignment: anchor.web3.PublicKey;
    amount: anchor.BN;
  };

  before(async () => {
    await fx.init();
    await fx.initializeProject();
  });

  const submitRequest = async (
    packageAddresses: PackageAddresses,
    contractorRoleAssignment: anchor.web3.PublicKey,
    amount: anchor.BN
  ) => {
    const paymentRequest = fx.derivePaymentRequestAddress(
      packageAddresses.workPackage,
      1
    );

    await fx.program.methods
      .submitPaymentRequest(new anchor.BN(1), amount, "ipfs://invoice-b4")
      .accountsStrict({
        contractor: fx.contractor.publicKey,
        project: fx.project,
        workPackage: packageAddresses.workPackage,
        contractorRoleAssignment,
        paymentRequest,
        vault: packageAddresses.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.contractor])
      .rpc();

    return paymentRequest;
  };

  const approveRequest = async (
    prepared: PreparedRequest,
    role: any,
    roleSeedByte: number,
    approver: anchor.web3.Keypair,
    approverRoleAssignment: anchor.web3.PublicKey,
    noteRef: string
  ) => {
    await fx.program.methods
      .approveRequest(role, noteRef)
      .accountsStrict({
        approver: approver.publicKey,
        project: fx.project,
        workPackage: prepared.packageAddresses.workPackage,
        paymentRequest: prepared.paymentRequest,
        approverRoleAssignment,
        approvalRecord: fx.deriveApprovalRecordAddress(
          prepared.paymentRequest,
          roleSeedByte
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([approver])
      .rpc();
  };

  const prepareRequest = async (
    amount = new anchor.BN(100_000),
    packageCap = new anchor.BN(200_000),
    approveThroughHigh = true
  ): Promise<PreparedRequest> => {
    const packageAddresses = await fx.createWorkPackageForTest(
      nextPackageId++,
      fx.contractor.publicKey,
      packageCap
    );
    await fx.fundPackage(packageAddresses, packageCap);
    const roles = await fx.assignDefaultRoles(packageAddresses);
    const paymentRequest = await submitRequest(
      packageAddresses,
      roles.contractorRoleAssignment,
      amount
    );

    const prepared = {
      packageAddresses,
      paymentRequest,
      amount,
      ...roles,
    };

    if (approveThroughHigh) {
      await approveRequest(
        prepared,
        { lowApprover: {} },
        roleSeed.lowApprover,
        fx.pm,
        roles.pmRoleAssignment,
        "ipfs://pm-release-note"
      );
      await approveRequest(
        prepared,
        { highApprover: {} },
        roleSeed.highApprover,
        fx.director,
        roles.directorRoleAssignment,
        "ipfs://director-release-note"
      );
    }

    return prepared;
  };

  const placeHold = async (
    prepared: PreparedRequest,
    holdRef = "ipfs://hold-ref"
  ) => {
    await fx.program.methods
      .placeHold(holdRef)
      .accountsStrict({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage: prepared.packageAddresses.workPackage,
        paymentRequest: prepared.paymentRequest,
      })
      .rpc();
  };

  const releasePayment = async (
    prepared: PreparedRequest,
    contractorTokenAccount = fx.contractorTokenAccount,
    authority = fx.finance
  ) =>
    fx.program.methods
      .releasePayment()
      .accountsStrict({
        authority: authority.publicKey,
        project: fx.project,
        workPackage: prepared.packageAddresses.workPackage,
        paymentRequest: prepared.paymentRequest,
        vaultAuthority: prepared.packageAddresses.vaultAuthority,
        vault: prepared.packageAddresses.vault,
        contractorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers(authority === fx.finance ? [] : [authority])
      .rpc();

  it("finance can place and remove a request hold", async () => {
    const prepared = await prepareRequest();

    await placeHold(prepared, "ipfs://hold-audit-note");

    let requestAccount = await fx.program.account.paymentRequestAccount.fetch(
      prepared.paymentRequest
    );
    assert.isTrue(requestAccount.holdActive);
    assert.ok(requestAccount.holdBy.equals(fx.finance.publicKey));
    assert.strictEqual(requestAccount.holdRef, "ipfs://hold-audit-note");

    await fx.program.methods
      .removeHold()
      .accountsStrict({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage: prepared.packageAddresses.workPackage,
        paymentRequest: prepared.paymentRequest,
      })
      .rpc();

    requestAccount = await fx.program.account.paymentRequestAccount.fetch(
      prepared.paymentRequest
    );
    assert.isFalse(requestAccount.holdActive);
    assert.ok(requestAccount.holdBy.equals(defaultPubkey));
    assert.strictEqual(requestAccount.holdRef, "");
  });

  it("hold blocks release", async () => {
    const prepared = await prepareRequest();
    await placeHold(prepared);

    await expectError(releasePayment(prepared), "RequestOnHold");
  });

  it("release before high approval fails", async () => {
    const prepared = await prepareRequest(
      new anchor.BN(100_000),
      new anchor.BN(500_000),
      false
    );

    await expectError(releasePayment(prepared), "InvalidStatus");
  });

  it("non-finance cannot release", async () => {
    const prepared = await prepareRequest();

    await expectError(
      releasePayment(prepared, fx.contractorTokenAccount, fx.unrelatedUser),
      "Unauthorized"
    );
  });

  it("release transfers tokens, clears active request, and completes at cap", async () => {
    const amount = new anchor.BN(100_000);
    const prepared = await prepareRequest(amount, amount);
    const contractorBefore = await getAccount(
      fx.provider.connection,
      fx.contractorTokenAccount
    );
    const vaultBefore = await getAccount(
      fx.provider.connection,
      prepared.packageAddresses.vault
    );

    await releasePayment(prepared);

    const contractorAfter = await getAccount(
      fx.provider.connection,
      fx.contractorTokenAccount
    );
    const vaultAfter = await getAccount(
      fx.provider.connection,
      prepared.packageAddresses.vault
    );
    assert.strictEqual(
      contractorAfter.amount - contractorBefore.amount,
      BigInt(amount.toNumber())
    );
    assert.strictEqual(
      vaultBefore.amount - vaultAfter.amount,
      BigInt(amount.toNumber())
    );

    const requestAccount = await fx.program.account.paymentRequestAccount.fetch(
      prepared.paymentRequest
    );
    assert.deepStrictEqual(requestAccount.status, { released: {} });
    assert.strictEqual(requestAccount.releasedAmount.toNumber(), 100_000);

    const workPackageAccount =
      await fx.program.account.workPackageAccount.fetch(
        prepared.packageAddresses.workPackage
      );
    assert.strictEqual(workPackageAccount.releasedAmount.toNumber(), 100_000);
    assert.deepStrictEqual(workPackageAccount.status, { completed: {} });
    assert.isFalse(workPackageAccount.hasActiveRequest);
    assert.ok(workPackageAccount.activeRequest.equals(defaultPubkey));

    await expectError(releasePayment(prepared), "RequestAlreadyReleased");
  });

  it("release rejects wrong contractor token owner", async () => {
    const prepared = await prepareRequest();
    const unrelatedTokenAccount = await createAssociatedTokenAccount(
      fx.provider.connection,
      fx.finance,
      fx.mint,
      fx.unrelatedUser.publicKey
    );

    await expectError(
      releasePayment(prepared, unrelatedTokenAccount),
      "WrongTokenOwner"
    );
  });

  it("release rejects wrong contractor token mint", async () => {
    const prepared = await prepareRequest();
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
      fx.contractor.publicKey
    );
    await mintTo(
      fx.provider.connection,
      fx.finance,
      wrongMint,
      wrongMintTokenAccount,
      fx.finance,
      1
    );

    await expectError(
      releasePayment(prepared, wrongMintTokenAccount),
      "WrongMint"
    );
  });
});
