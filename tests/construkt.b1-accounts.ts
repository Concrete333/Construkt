import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  budgetAmount,
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
  let pmRoleAssignment: anchor.web3.PublicKey;
  let directorRoleAssignment: anchor.web3.PublicKey;

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
    assert.ok(projectAccount.mint.equals(fx.mint));
    assert.strictEqual(
      projectAccount.budgetAmount.toNumber(),
      budgetAmount.toNumber()
    );
    assert.strictEqual(projectAccount.allocatedAmount.toNumber(), 0);
    assert.strictEqual(projectAccount.name, "Demo Hospital Fit-Out");
    assert.deepStrictEqual(projectAccount.status, { active: {} });

    await fx.program.methods
      .createWorkPackage(
        new anchor.BN(packageId),
        capAmount,
        fx.contractor.publicKey,
        "ipfs://scope-ref"
      )
      .accountsStrict({
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
    const projectAfterPackage = await fx.program.account.projectAccount.fetch(
      fx.project
    );
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
    assert.strictEqual(
      projectAfterPackage.allocatedAmount.toNumber(),
      capAmount.toNumber()
    );
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
      assert.ok(roleAssignmentAccount.updatedBy.equals(fx.finance.publicKey));
      assert.strictEqual(
        roleAssignmentAccount.updatedAt.toNumber(),
        roleAssignmentAccount.assignedAt.toNumber()
      );

      if (assignment.roleByte === roleSeed.lowApprover) {
        pmRoleAssignment = roleAssignment;
      } else if (assignment.roleByte === roleSeed.highApprover) {
        directorRoleAssignment = roleAssignment;
      }
    }
  });

  it("finance toggles roles with update metadata and no-op guards", async () => {
    await fx.program.methods
      .setRoleActive(false)
      .accountsStrict({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage,
        roleAssignment: pmRoleAssignment,
      })
      .rpc();

    const roleAssignmentAccount =
      await fx.program.account.roleAssignmentAccount.fetch(pmRoleAssignment);
    assert.isFalse(roleAssignmentAccount.active);
    assert.ok(roleAssignmentAccount.updatedBy.equals(fx.finance.publicKey));
    assert.isAtLeast(
      roleAssignmentAccount.updatedAt.toNumber(),
      roleAssignmentAccount.assignedAt.toNumber()
    );

    await expectError(
      fx.program.methods
        .setRoleActive(false)
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: pmRoleAssignment,
        })
        .rpc(),
      "RoleAlreadyInRequestedState"
    );

    const conflictingHighApprover = fx.roleAssignmentAddressForPackage(
      workPackage,
      roleSeed.highApprover,
      fx.pm.publicKey
    );
    await expectError(
      fx.program.methods
        .assignRole({ highApprover: {} }, fx.pm.publicKey)
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: conflictingHighApprover,
          opposingApproverRoleAssignment: pmRoleAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "ApproverRoleConflict"
    );

    await fx.program.methods
      .setRoleActive(true)
      .accountsStrict({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage,
        roleAssignment: pmRoleAssignment,
      })
      .rpc();

    const reactivatedRoleAssignment =
      await fx.program.account.roleAssignmentAccount.fetch(pmRoleAssignment);
    assert.isTrue(reactivatedRoleAssignment.active);
    assert.ok(reactivatedRoleAssignment.updatedBy.equals(fx.finance.publicKey));

    await expectError(
      fx.program.methods
        .setRoleActive(true)
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: pmRoleAssignment,
        })
        .rpc(),
      "RoleAlreadyInRequestedState"
    );
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
        .accountsStrict({
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
          "ipfs://ok",
          budgetAmount
        )
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: longNameProject,
          mint: fx.mint,
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
          "x".repeat(129),
          budgetAmount
        )
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: longMetadataProject,
          mint: fx.mint,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "StringTooLong"
    );

    const zeroBudgetProject = fx.deriveProjectAddress(
      fx.finance.publicKey,
      fx.projectId + 3
    );
    await expectError(
      fx.program.methods
        .initializeProject(
          new anchor.BN(fx.projectId + 3),
          "Valid Name",
          "ipfs://ok",
          new anchor.BN(0)
        )
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: zeroBudgetProject,
          mint: fx.mint,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidAmount"
    );

    await expectError(
      fx.program.methods
        .createWorkPackage(
          new anchor.BN(3),
          new anchor.BN(0),
          fx.contractor.publicKey,
          "ipfs://scope-ref"
        )
        .accountsStrict({
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
        .accountsStrict({
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
        .accountsStrict({
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
        .accountsStrict({
          authority: fx.unrelatedUser.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment,
          opposingApproverRoleAssignment: fx.roleAssignmentAddressForPackage(
            workPackage,
            roleSeed.highApprover,
            wallet
          ),
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
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: wrongContractorAssignment,
          opposingApproverRoleAssignment: wrongContractorAssignment,
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
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: defaultWalletAssignment,
          opposingApproverRoleAssignment: fx.roleAssignmentAddressForPackage(
            workPackage,
            roleSeed.highApprover,
            defaultPubkey
          ),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidAccountRelationship"
    );

    const conflictingHighApprover = fx.roleAssignmentAddressForPackage(
      workPackage,
      roleSeed.highApprover,
      fx.pm.publicKey
    );
    await expectError(
      fx.program.methods
        .assignRole({ highApprover: {} }, fx.pm.publicKey)
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: conflictingHighApprover,
          opposingApproverRoleAssignment: pmRoleAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "ApproverRoleConflict"
    );

    const conflictingLowApprover = fx.roleAssignmentAddressForPackage(
      workPackage,
      roleSeed.lowApprover,
      fx.director.publicKey
    );
    await expectError(
      fx.program.methods
        .assignRole({ lowApprover: {} }, fx.director.publicKey)
        .accountsStrict({
          authority: fx.finance.publicKey,
          project: fx.project,
          workPackage,
          roleAssignment: conflictingLowApprover,
          opposingApproverRoleAssignment: directorRoleAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "ApproverRoleConflict"
    );
  });
});
