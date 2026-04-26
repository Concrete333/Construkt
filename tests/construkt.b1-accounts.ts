import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  capAmount,
  createFixture,
  defaultPubkey,
  expectError,
  roleSeed,
} from "./setup";

describe("construkt b1 accounts and roles", () => {
  const fx = createFixture();
  const packageId = 1;
  let workPackage: anchor.web3.PublicKey;
  let vaultAuthority: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  before(async () => {
    await fx.init();
    const addresses = fx.deriveWorkPackageAddresses(packageId);
    workPackage = addresses.workPackage;
    vaultAuthority = addresses.vaultAuthority;
    vault = addresses.vault;
  });

  it("finance creates project and package", async () => {
    await fx.initializeProject();

    const projectAccount = await fx.program.account.projectAccount.fetch(
      fx.project
    );
    assert.ok(projectAccount.authority.equals(fx.finance.publicKey));
    assert.strictEqual(projectAccount.projectId.toNumber(), fx.projectId);
    assert.strictEqual(projectAccount.name, "Demo Hospital Fit-Out");
    assert.deepStrictEqual(projectAccount.status, { active: {} });

    await fx.program.methods
      .createWorkPackage(
        new anchor.BN(packageId),
        capAmount,
        fx.contractor.publicKey,
        "ipfs://scope-ref"
      )
      .accounts({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage,
        vaultAuthority,
        mint: fx.mint,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const workPackageAccount =
      await fx.program.account.workPackageAccount.fetch(workPackage);
    assert.ok(workPackageAccount.project.equals(fx.project));
    assert.strictEqual(workPackageAccount.packageId.toNumber(), packageId);
    assert.strictEqual(
      workPackageAccount.capAmount.toNumber(),
      capAmount.toNumber()
    );
    assert.ok(workPackageAccount.contractor.equals(fx.contractor.publicKey));
    assert.ok(workPackageAccount.mint.equals(fx.mint));
    assert.ok(workPackageAccount.vault.equals(vault));
    assert.deepStrictEqual(workPackageAccount.status, { active: {} });
    assert.isFalse(workPackageAccount.hasActiveRequest);
  });

  it("finance assigns roles", async () => {
    const assignments = [
      {
        role: { contractor: {} },
        roleByte: roleSeed.contractor,
        wallet: fx.contractor.publicKey,
      },
      {
        role: { lowApprover: {} },
        roleByte: roleSeed.lowApprover,
        wallet: fx.pm.publicKey,
      },
      {
        role: { highApprover: {} },
        roleByte: roleSeed.highApprover,
        wallet: fx.director.publicKey,
      },
    ];

    for (const assignment of assignments) {
      const roleAssignment = await fx.assignRole(
        { workPackage },
        assignment.role,
        assignment.roleByte,
        assignment.wallet
      );

      const roleAssignmentAccount =
        await fx.program.account.roleAssignmentAccount.fetch(roleAssignment);
      assert.ok(roleAssignmentAccount.workPackage.equals(workPackage));
      assert.ok(roleAssignmentAccount.wallet.equals(assignment.wallet));
      assert.isTrue(roleAssignmentAccount.active);
      assert.ok(roleAssignmentAccount.assignedBy.equals(fx.finance.publicKey));
    }
  });

  it("non-finance cannot create a work package", async () => {
    const unauthorized = fx.deriveWorkPackageAddresses(2);

    await expectError(
      fx.program.methods
        .createWorkPackage(
          new anchor.BN(2),
          capAmount,
          fx.contractor.publicKey,
          "ipfs://unauthorized-scope"
        )
        .accounts({
          authority: fx.unrelatedUser.publicKey,
          project: fx.project,
          workPackage: unauthorized.workPackage,
          vaultAuthority: unauthorized.vaultAuthority,
          mint: fx.mint,
          vault: unauthorized.vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.unrelatedUser])
        .rpc(),
      "Unauthorized"
    );
  });

  it("rejects invalid project and package setup inputs", async () => {
    const longNameProject = fx.deriveProjectAddress(
      fx.finance.publicKey,
      fx.projectId + 1
    );
    await expectError(
      fx.program.methods
        .initializeProject(
          new anchor.BN(fx.projectId + 1),
          "x".repeat(65),
          "ipfs://ok"
        )
        .accounts({
          authority: fx.finance.publicKey,
          project: longNameProject,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "StringTooLong"
    );

    const longMetadataProject = fx.deriveProjectAddress(
      fx.finance.publicKey,
      fx.projectId + 2
    );
    await expectError(
      fx.program.methods
        .initializeProject(
          new anchor.BN(fx.projectId + 2),
          "Valid Name",
          "x".repeat(129)
        )
        .accounts({
          authority: fx.finance.publicKey,
          project: longMetadataProject,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "StringTooLong"
    );

    await expectError(
      fx.program.methods
        .createWorkPackage(
          new anchor.BN(3),
          new anchor.BN(0),
          fx.contractor.publicKey,
          "ipfs://scope-ref"
        )
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: fx.deriveWorkPackageAddresses(3).workPackage,
          vaultAuthority: fx.deriveWorkPackageAddresses(3).vaultAuthority,
          mint: fx.mint,
          vault: fx.deriveWorkPackageAddresses(3).vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidAmount"
    );

    const defaultContractor = fx.deriveWorkPackageAddresses(4);
    await expectError(
      fx.program.methods
        .createWorkPackage(
          new anchor.BN(4),
          capAmount,
          defaultPubkey,
          "ipfs://scope-ref"
        )
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: defaultContractor.workPackage,
          vaultAuthority: defaultContractor.vaultAuthority,
          mint: fx.mint,
          vault: defaultContractor.vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidAccountRelationship"
    );

    const longScope = fx.deriveWorkPackageAddresses(5);
    await expectError(
      fx.program.methods
        .createWorkPackage(
          new anchor.BN(5),
          capAmount,
          fx.contractor.publicKey,
          "x".repeat(129)
        )
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage: longScope.workPackage,
          vaultAuthority: longScope.vaultAuthority,
          mint: fx.mint,
          vault: longScope.vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "StringTooLong"
    );
  });

  it("non-finance cannot assign roles", async () => {
    const wallet = anchor.web3.Keypair.generate().publicKey;
    const roleAssignment = fx.roleAssignmentAddressForPackage(
      workPackage,
      roleSeed.lowApprover,
      wallet
    );

    await expectError(
      fx.program.methods
        .assignRole({ lowApprover: {} }, wallet)
        .accounts({
          authority: fx.unrelatedUser.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.unrelatedUser])
        .rpc(),
      "Unauthorized"
    );
  });

  it("rejects invalid role assignments", async () => {
    const wrongContractorWallet = anchor.web3.Keypair.generate().publicKey;
    const wrongContractorAssignment = fx.roleAssignmentAddressForPackage(
      workPackage,
      roleSeed.contractor,
      wrongContractorWallet
    );

    await expectError(
      fx.program.methods
        .assignRole({ contractor: {} }, wrongContractorWallet)
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: wrongContractorAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidAccountRelationship"
    );

    const defaultWalletAssignment = fx.roleAssignmentAddressForPackage(
      workPackage,
      roleSeed.lowApprover,
      defaultPubkey
    );

    await expectError(
      fx.program.methods
        .assignRole({ lowApprover: {} }, defaultPubkey)
        .accounts({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: defaultWalletAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidAccountRelationship"
    );
  });
});
