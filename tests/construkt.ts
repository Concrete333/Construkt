import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Construkt } from "../target/types/construkt";

describe("construkt", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.construkt as Program<Construkt>;
  const finance = (provider.wallet as anchor.Wallet).payer;
  const contractor = anchor.web3.Keypair.generate();
  const pm = anchor.web3.Keypair.generate();
  const director = anchor.web3.Keypair.generate();
  const unrelatedUser = anchor.web3.Keypair.generate();

  const u64Seed = (value: number) => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
  };

  const roleSeed = {
    contractor: 1,
    lowApprover: 2,
    highApprover: 3,
  };
  const defaultPubkey = new anchor.web3.PublicKey(
    "11111111111111111111111111111111"
  );

  const projectId = 1;
  const packageId = 1;
  const capAmount = new anchor.BN(1_000_000);

  let mint: anchor.web3.PublicKey;
  let project: anchor.web3.PublicKey;
  let workPackage: anchor.web3.PublicKey;
  let vaultAuthority: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  const deriveWorkPackageAddresses = (id: number) => {
    const [workPackageAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("work_package"), project.toBuffer(), u64Seed(id)],
      program.programId
    );
    const [vaultAuthorityAddress] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault_authority"), workPackageAddress.toBuffer()],
        program.programId
      );
    const vaultAddress = getAssociatedTokenAddressSync(
      mint,
      vaultAuthorityAddress,
      true
    );

    return {
      workPackage: workPackageAddress,
      vaultAuthority: vaultAuthorityAddress,
      vault: vaultAddress,
    };
  };

  const deriveProjectAddress = (authority: anchor.web3.PublicKey, id: number) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), authority.toBuffer(), u64Seed(id)],
      program.programId
    )[0];

  const roleAssignmentAddress = (
    roleByte: number,
    wallet: anchor.web3.PublicKey
  ) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("role"),
        workPackage.toBuffer(),
        Buffer.from([roleByte]),
        wallet.toBuffer(),
      ],
      program.programId
    )[0];

  const expectError = async (action: Promise<unknown>, expected: string) => {
    try {
      await action;
      assert.fail(`Expected transaction to fail with ${expected}`);
    } catch (error) {
      assert.include(String(error), expected);
    }
  };

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        unrelatedUser.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    mint = await createMint(
      provider.connection,
      finance,
      finance.publicKey,
      null,
      6
    );

    [project] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        finance.publicKey.toBuffer(),
        u64Seed(projectId),
      ],
      program.programId
    );

    const packageAddresses = deriveWorkPackageAddresses(packageId);
    workPackage = packageAddresses.workPackage;
    vaultAuthority = packageAddresses.vaultAuthority;
    vault = packageAddresses.vault;
  });

  it("Finance creates project and package", async () => {
    await program.methods
      .initializeProject(
        new anchor.BN(projectId),
        "Demo Hospital Fit-Out",
        "ipfs://project-metadata"
      )
      .accounts({
        authority: finance.publicKey,
        project,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const projectAccount = await program.account.projectAccount.fetch(project);
    assert.ok(projectAccount.authority.equals(finance.publicKey));
    assert.strictEqual(projectAccount.projectId.toNumber(), projectId);
    assert.strictEqual(projectAccount.name, "Demo Hospital Fit-Out");
    assert.deepStrictEqual(projectAccount.status, { active: {} });

    await program.methods
      .createWorkPackage(
        new anchor.BN(packageId),
        capAmount,
        contractor.publicKey,
        "ipfs://scope-ref"
      )
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage,
        vaultAuthority,
        mint,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const workPackageAccount = await program.account.workPackageAccount.fetch(
      workPackage
    );
    assert.ok(workPackageAccount.project.equals(project));
    assert.strictEqual(workPackageAccount.packageId.toNumber(), packageId);
    assert.strictEqual(
      workPackageAccount.capAmount.toNumber(),
      capAmount.toNumber()
    );
    assert.ok(workPackageAccount.contractor.equals(contractor.publicKey));
    assert.ok(workPackageAccount.mint.equals(mint));
    assert.ok(workPackageAccount.vault.equals(vault));
    assert.deepStrictEqual(workPackageAccount.status, { active: {} });
    assert.isFalse(workPackageAccount.hasActiveRequest);
  });

  it("Non-finance cannot create a work package", async () => {
    const nextPackageId = 2;
    const unauthorized = deriveWorkPackageAddresses(nextPackageId);

    await expectError(
      program.methods
        .createWorkPackage(
          new anchor.BN(nextPackageId),
          capAmount,
          contractor.publicKey,
          "ipfs://unauthorized-scope"
        )
        .accounts({
          authority: unrelatedUser.publicKey,
          project,
          workPackage: unauthorized.workPackage,
          vaultAuthority: unauthorized.vaultAuthority,
          mint,
          vault: unauthorized.vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([unrelatedUser])
        .rpc(),
      "Unauthorized"
    );
  });

  it("Rejects invalid project and package setup inputs", async () => {
    const longNameProject = deriveProjectAddress(finance.publicKey, 2);
    await expectError(
      program.methods
        .initializeProject(
          new anchor.BN(2),
          "x".repeat(65),
          "ipfs://project-metadata"
        )
        .accounts({
          authority: finance.publicKey,
          project: longNameProject,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "StringTooLong"
    );

    const longMetadataProject = deriveProjectAddress(finance.publicKey, 3);
    await expectError(
      program.methods
        .initializeProject(new anchor.BN(3), "Valid Name", "x".repeat(129))
        .accounts({
          authority: finance.publicKey,
          project: longMetadataProject,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "StringTooLong"
    );

    const zeroCap = deriveWorkPackageAddresses(3);
    await expectError(
      program.methods
        .createWorkPackage(
          new anchor.BN(3),
          new anchor.BN(0),
          contractor.publicKey,
          "ipfs://scope-ref"
        )
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage: zeroCap.workPackage,
          vaultAuthority: zeroCap.vaultAuthority,
          mint,
          vault: zeroCap.vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc(),
      "InvalidAmount"
    );

    const defaultContractor = deriveWorkPackageAddresses(4);
    await expectError(
      program.methods
        .createWorkPackage(
          new anchor.BN(4),
          capAmount,
          defaultPubkey,
          "ipfs://scope-ref"
        )
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage: defaultContractor.workPackage,
          vaultAuthority: defaultContractor.vaultAuthority,
          mint,
          vault: defaultContractor.vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc(),
      "InvalidAccountRelationship"
    );

    const longScope = deriveWorkPackageAddresses(5);
    await expectError(
      program.methods
        .createWorkPackage(
          new anchor.BN(5),
          capAmount,
          contractor.publicKey,
          "x".repeat(129)
        )
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage: longScope.workPackage,
          vaultAuthority: longScope.vaultAuthority,
          mint,
          vault: longScope.vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc(),
      "StringTooLong"
    );
  });

  it("Finance assigns roles", async () => {
    const assignments = [
      {
        role: { contractor: {} },
        roleByte: roleSeed.contractor,
        wallet: contractor.publicKey,
      },
      {
        role: { lowApprover: {} },
        roleByte: roleSeed.lowApprover,
        wallet: pm.publicKey,
      },
      {
        role: { highApprover: {} },
        roleByte: roleSeed.highApprover,
        wallet: director.publicKey,
      },
    ];

    for (const assignment of assignments) {
      const roleAssignment = roleAssignmentAddress(
        assignment.roleByte,
        assignment.wallet
      );

      await program.methods
        .assignRole(assignment.role, assignment.wallet)
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage,
          roleAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const roleAssignmentAccount =
        await program.account.roleAssignmentAccount.fetch(roleAssignment);
      assert.ok(roleAssignmentAccount.workPackage.equals(workPackage));
      assert.ok(roleAssignmentAccount.wallet.equals(assignment.wallet));
      assert.isTrue(roleAssignmentAccount.active);
      assert.ok(roleAssignmentAccount.assignedBy.equals(finance.publicKey));
    }
  });

  it("Non-finance cannot assign roles", async () => {
    const wallet = anchor.web3.Keypair.generate().publicKey;
    const roleAssignment = roleAssignmentAddress(roleSeed.lowApprover, wallet);

    await expectError(
      program.methods
        .assignRole({ lowApprover: {} }, wallet)
        .accounts({
          authority: unrelatedUser.publicKey,
          project,
          workPackage,
          roleAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([unrelatedUser])
        .rpc(),
      "Unauthorized"
    );
  });

  it("Rejects invalid role assignments", async () => {
    const wrongContractorWallet = anchor.web3.Keypair.generate().publicKey;
    const wrongContractorAssignment = roleAssignmentAddress(
      roleSeed.contractor,
      wrongContractorWallet
    );

    await expectError(
      program.methods
        .assignRole({ contractor: {} }, wrongContractorWallet)
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage,
          roleAssignment: wrongContractorAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidAccountRelationship"
    );

    const defaultWalletAssignment = roleAssignmentAddress(
      roleSeed.lowApprover,
      defaultPubkey
    );

    await expectError(
      program.methods
        .assignRole({ lowApprover: {} }, defaultPubkey)
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage,
          roleAssignment: defaultWalletAssignment,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidAccountRelationship"
    );
  });
});
