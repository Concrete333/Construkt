import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  mintTo,
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
  const pm2 = anchor.web3.Keypair.generate();

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
  const initialFinanceTokens = 3_000_000;
  const firstFundingAmount = new anchor.BN(600_000);

  let mint: anchor.web3.PublicKey;
  let financeTokenAccount: anchor.web3.PublicKey;
  let contractorTokenAccount: anchor.web3.PublicKey;
  let project: anchor.web3.PublicKey;
  let workPackage: anchor.web3.PublicKey;
  let vaultAuthority: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;
  let paymentRequest: anchor.web3.PublicKey;
  const requestId = 1;

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

  const createWorkPackageForTest = async (
    id: number,
    packageContractor = contractor.publicKey,
    packageCap = capAmount,
    scopeRef = "ipfs://scope-ref"
  ) => {
    const addresses = deriveWorkPackageAddresses(id);

    await program.methods
      .createWorkPackage(
        new anchor.BN(id),
        packageCap,
        packageContractor,
        scopeRef
      )
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: addresses.workPackage,
        vaultAuthority: addresses.vaultAuthority,
        mint,
        vault: addresses.vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return addresses;
  };

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

  const roleAssignmentAddressForPackage = (
    wpKey: anchor.web3.PublicKey,
    roleByte: number,
    wallet: anchor.web3.PublicKey
  ) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("role"),
        wpKey.toBuffer(),
        Buffer.from([roleByte]),
        wallet.toBuffer(),
      ],
      program.programId
    )[0];

  const derivePaymentRequestAddress = (
    wpKey: anchor.web3.PublicKey,
    reqId: number
  ) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("payment_request"), wpKey.toBuffer(), u64Seed(reqId)],
      program.programId
    )[0];

  const deriveApprovalRecordAddress = (
    prKey: anchor.web3.PublicKey,
    roleByte: number
  ) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("approval"), prKey.toBuffer(), Buffer.from([roleByte])],
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
    for (const kp of [unrelatedUser, contractor, pm, director, pm2]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          kp.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        "confirmed"
      );
    }

    mint = await createMint(
      provider.connection,
      finance,
      finance.publicKey,
      null,
      6
    );
    financeTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      finance,
      mint,
      finance.publicKey
    );
    await mintTo(
      provider.connection,
      finance,
      mint,
      financeTokenAccount,
      finance,
      initialFinanceTokens
    );

    contractorTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      finance,
      mint,
      contractor.publicKey
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

  it("Finance funds package vault", async () => {
    await program.methods
      .fundEscrow(firstFundingAmount)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage,
        mint,
        financeTokenAccount,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const workPackageAccount = await program.account.workPackageAccount.fetch(
      workPackage
    );
    assert.strictEqual(
      workPackageAccount.fundedAmount.toNumber(),
      firstFundingAmount.toNumber()
    );

    const vaultAccount = await getAccount(
      provider.connection,
      vault,
      provider.opts.commitment,
      TOKEN_PROGRAM_ID
    );
    assert.strictEqual(
      Number(vaultAccount.amount),
      firstFundingAmount.toNumber()
    );
  });

  it("Rejects invalid escrow funding inputs", async () => {
    const wrongMint = await createMint(
      provider.connection,
      finance,
      finance.publicKey,
      null,
      6
    );
    const wrongMintTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      finance,
      wrongMint,
      finance.publicKey
    );
    await mintTo(
      provider.connection,
      finance,
      wrongMint,
      wrongMintTokenAccount,
      finance,
      1_000
    );

    await expectError(
      program.methods
        .fundEscrow(new anchor.BN(1))
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage,
          mint,
          financeTokenAccount: wrongMintTokenAccount,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "WrongMint"
    );

    const unrelatedTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      finance,
      mint,
      unrelatedUser.publicKey
    );
    await mintTo(
      provider.connection,
      finance,
      mint,
      unrelatedTokenAccount,
      finance,
      1_000
    );

    await expectError(
      program.methods
        .fundEscrow(new anchor.BN(1))
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage,
          mint,
          financeTokenAccount: unrelatedTokenAccount,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "WrongTokenOwner"
    );

    await expectError(
      program.methods
        .fundEscrow(new anchor.BN(400_001))
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage,
          mint,
          financeTokenAccount,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "InsufficientRemainingCap"
    );
  });

  it("Rejects zero amount and non-finance escrow funding", async () => {
    await expectError(
      program.methods
        .fundEscrow(new anchor.BN(0))
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage,
          mint,
          financeTokenAccount,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "InvalidAmount"
    );

    const nonFinance = anchor.web3.Keypair.generate();
    const nonFinanceTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      finance,
      mint,
      nonFinance.publicKey
    );
    await mintTo(
      provider.connection,
      finance,
      mint,
      nonFinanceTokenAccount,
      finance,
      1_000
    );

    await expectError(
      program.methods
        .fundEscrow(new anchor.BN(1))
        .accounts({
          authority: nonFinance.publicKey,
          project,
          workPackage,
          mint,
          financeTokenAccount: nonFinanceTokenAccount,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([nonFinance])
        .rpc(),
      "Unauthorized"
    );
  });

  it("Allows funding exactly to package cap", async () => {
    const exactCapPackage = await createWorkPackageForTest(10);

    await program.methods
      .fundEscrow(capAmount)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: exactCapPackage.workPackage,
        mint,
        financeTokenAccount,
        vault: exactCapPackage.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const workPackageAccount = await program.account.workPackageAccount.fetch(
      exactCapPackage.workPackage
    );
    assert.strictEqual(
      workPackageAccount.fundedAmount.toNumber(),
      capAmount.toNumber()
    );

    const vaultAccount = await getAccount(
      provider.connection,
      exactCapPackage.vault,
      provider.opts.commitment,
      TOKEN_PROGRAM_ID
    );
    assert.strictEqual(Number(vaultAccount.amount), capAmount.toNumber());
  });

  it("Accumulates multiple escrow fundings", async () => {
    const multiFundingPackage = await createWorkPackageForTest(11);
    const depositAmount = new anchor.BN(100_000);

    for (let i = 0; i < 2; i++) {
      await program.methods
        .fundEscrow(depositAmount)
        .accounts({
          authority: finance.publicKey,
          project,
          workPackage: multiFundingPackage.workPackage,
          mint,
          financeTokenAccount,
          vault: multiFundingPackage.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    }

    const workPackageAccount = await program.account.workPackageAccount.fetch(
      multiFundingPackage.workPackage
    );
    assert.strictEqual(workPackageAccount.fundedAmount.toNumber(), 200_000);

    const vaultAccount = await getAccount(
      provider.connection,
      multiFundingPackage.vault,
      provider.opts.commitment,
      TOKEN_PROGRAM_ID
    );
    assert.strictEqual(Number(vaultAccount.amount), 200_000);
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

  // ── B3: Payment Request and Approvals ─────────────────────────────────────

  it("Submit request with empty document reference fails", async () => {
    const contractorRoleAssignment = roleAssignmentAddress(
      roleSeed.contractor,
      contractor.publicKey
    );
    const targetRequest = derivePaymentRequestAddress(workPackage, requestId);

    await expectError(
      program.methods
        .submitPaymentRequest(new anchor.BN(requestId), new anchor.BN(100_000), "")
        .accounts({
          contractor: contractor.publicKey,
          project,
          workPackage,
          contractorRoleAssignment,
          paymentRequest: targetRequest,
          vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc(),
      "MissingDocumentReference"
    );
  });

  it("Contractor submits payment request", async () => {
    const contractorRoleAssignment = roleAssignmentAddress(
      roleSeed.contractor,
      contractor.publicKey
    );
    paymentRequest = derivePaymentRequestAddress(workPackage, requestId);

    await program.methods
      .submitPaymentRequest(
        new anchor.BN(requestId),
        new anchor.BN(100_000),
        "ipfs://invoice-001"
      )
      .accounts({
        contractor: contractor.publicKey,
        project,
        workPackage,
        contractorRoleAssignment,
        paymentRequest,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contractor])
      .rpc();

    const prAccount = await program.account.paymentRequestAccount.fetch(
      paymentRequest
    );
    assert.ok(prAccount.workPackage.equals(workPackage));
    assert.ok(prAccount.contractor.equals(contractor.publicKey));
    assert.strictEqual(prAccount.amount.toNumber(), 100_000);
    assert.strictEqual(prAccount.documentRef, "ipfs://invoice-001");
    assert.deepStrictEqual(prAccount.status, { submitted: {} });
    assert.isFalse(prAccount.holdActive);

    const wpAccount = await program.account.workPackageAccount.fetch(workPackage);
    assert.isTrue(wpAccount.hasActiveRequest);
    assert.ok(wpAccount.activeRequest.equals(paymentRequest));
    assert.strictEqual(wpAccount.requestCounter.toNumber(), 1);
  });

  it("Non-contractor cannot submit payment request", async () => {
    const fakeContractorRole = roleAssignmentAddressForPackage(
      workPackage,
      roleSeed.contractor,
      unrelatedUser.publicKey
    );
    const fakeRequest = derivePaymentRequestAddress(workPackage, 99);

    await expectError(
      program.methods
        .submitPaymentRequest(
          new anchor.BN(99),
          new anchor.BN(100_000),
          "ipfs://fake"
        )
        .accounts({
          contractor: unrelatedUser.publicKey,
          project,
          workPackage,
          contractorRoleAssignment: fakeContractorRole,
          paymentRequest: fakeRequest,
          vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([unrelatedUser])
        .rpc(),
      "AccountNotInitialized"
    );
  });

  it("Contractor cannot submit second active request", async () => {
    const contractorRoleAssignment = roleAssignmentAddress(
      roleSeed.contractor,
      contractor.publicKey
    );
    const secondRequest = derivePaymentRequestAddress(workPackage, 2);

    await expectError(
      program.methods
        .submitPaymentRequest(
          new anchor.BN(2),
          new anchor.BN(50_000),
          "ipfs://invoice-002"
        )
        .accounts({
          contractor: contractor.publicKey,
          project,
          workPackage,
          contractorRoleAssignment,
          paymentRequest: secondRequest,
          vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc(),
      "ActiveRequestExists"
    );
  });

  it("Contractor can update document reference", async () => {
    const contractorRoleAssignment = roleAssignmentAddress(
      roleSeed.contractor,
      contractor.publicKey
    );

    await program.methods
      .addDocumentReference("ipfs://invoice-001-v2")
      .accounts({
        contractor: contractor.publicKey,
        project,
        workPackage,
        paymentRequest,
        contractorRoleAssignment,
      })
      .signers([contractor])
      .rpc();

    const prAccount = await program.account.paymentRequestAccount.fetch(
      paymentRequest
    );
    assert.strictEqual(prAccount.documentRef, "ipfs://invoice-001-v2");
  });

  it("Contractor cannot approve own request", async () => {
    // Contractor uses their own Contractor role — InvalidRole fires because
    // approve_request only accepts LowApprover or HighApprover roles.
    const contractorAsApproverRole = roleAssignmentAddress(
      roleSeed.contractor,
      contractor.publicKey
    );
    const approvalRecord = deriveApprovalRecordAddress(
      paymentRequest,
      roleSeed.contractor
    );

    await expectError(
      program.methods
        .approveRequest({ contractor: {} }, "")
        .accounts({
          approver: contractor.publicKey,
          project,
          workPackage,
          paymentRequest,
          approverRoleAssignment: contractorAsApproverRole,
          approvalRecord,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc(),
      "InvalidRole"
    );
  });

  it("Director cannot approve before PM", async () => {
    const directorRoleAssignment = roleAssignmentAddress(
      roleSeed.highApprover,
      director.publicKey
    );
    const approvalRecord = deriveApprovalRecordAddress(
      paymentRequest,
      roleSeed.highApprover
    );

    await expectError(
      program.methods
        .approveRequest({ highApprover: {} }, "")
        .accounts({
          approver: director.publicKey,
          project,
          workPackage,
          paymentRequest,
          approverRoleAssignment: directorRoleAssignment,
          approvalRecord,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([director])
        .rpc(),
      "InvalidApprovalOrder"
    );
  });

  it("Inactive approver cannot approve", async () => {
    // Spin up a fresh work package so main happy path is unaffected.
    const inactiveTestPackage = await createWorkPackageForTest(30);
    await program.methods
      .fundEscrow(new anchor.BN(200_000))
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: inactiveTestPackage.workPackage,
        mint,
        financeTokenAccount,
        vault: inactiveTestPackage.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Assign pm2 as LowApprover and contractor as Contractor on this package.
    const pm2LowApproverRole = roleAssignmentAddressForPackage(
      inactiveTestPackage.workPackage,
      roleSeed.lowApprover,
      pm2.publicKey
    );
    const contractorRoleOnPackage30 = roleAssignmentAddressForPackage(
      inactiveTestPackage.workPackage,
      roleSeed.contractor,
      contractor.publicKey
    );
    await program.methods
      .assignRole({ contractor: {} }, contractor.publicKey)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: inactiveTestPackage.workPackage,
        roleAssignment: contractorRoleOnPackage30,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    await program.methods
      .assignRole({ lowApprover: {} }, pm2.publicKey)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: inactiveTestPackage.workPackage,
        roleAssignment: pm2LowApproverRole,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Submit a request on the new package.
    const inactiveTestRequest = derivePaymentRequestAddress(
      inactiveTestPackage.workPackage,
      1
    );
    await program.methods
      .submitPaymentRequest(
        new anchor.BN(1),
        new anchor.BN(50_000),
        "ipfs://inactive-test"
      )
      .accounts({
        contractor: contractor.publicKey,
        project,
        workPackage: inactiveTestPackage.workPackage,
        contractorRoleAssignment: contractorRoleOnPackage30,
        paymentRequest: inactiveTestRequest,
        vault: inactiveTestPackage.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contractor])
      .rpc();

    // Deactivate pm2's role.
    await program.methods
      .setRoleActive(false)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: inactiveTestPackage.workPackage,
        roleAssignment: pm2LowApproverRole,
      })
      .rpc();

    // pm2 tries to approve — role is inactive, should fail.
    const pm2ApprovalRecord = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("approval"),
        inactiveTestRequest.toBuffer(),
        Buffer.from([roleSeed.lowApprover]),
      ],
      program.programId
    )[0];

    await expectError(
      program.methods
        .approveRequest({ lowApprover: {} }, "")
        .accounts({
          approver: pm2.publicKey,
          project,
          workPackage: inactiveTestPackage.workPackage,
          paymentRequest: inactiveTestRequest,
          approverRoleAssignment: pm2LowApproverRole,
          approvalRecord: pm2ApprovalRecord,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([pm2])
        .rpc(),
      "InactiveRoleAssignment"
    );
  });

  it("PM approves first", async () => {
    const pmRoleAssignment = roleAssignmentAddress(
      roleSeed.lowApprover,
      pm.publicKey
    );
    const pmApprovalRecord = deriveApprovalRecordAddress(
      paymentRequest,
      roleSeed.lowApprover
    );

    await program.methods
      .approveRequest({ lowApprover: {} }, "ipfs://pm-note")
      .accounts({
        approver: pm.publicKey,
        project,
        workPackage,
        paymentRequest,
        approverRoleAssignment: pmRoleAssignment,
        approvalRecord: pmApprovalRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([pm])
      .rpc();

    const prAccount = await program.account.paymentRequestAccount.fetch(
      paymentRequest
    );
    assert.deepStrictEqual(prAccount.status, { lowApproved: {} });

    const approvalAccount = await program.account.approvalRecord.fetch(
      pmApprovalRecord
    );
    assert.ok(approvalAccount.approver.equals(pm.publicKey));
    assert.deepStrictEqual(approvalAccount.role, { lowApprover: {} });
    assert.deepStrictEqual(approvalAccount.decision, { approved: {} });
  });

  it("PM duplicate approval fails", async () => {
    const pmRoleAssignment = roleAssignmentAddress(
      roleSeed.lowApprover,
      pm.publicKey
    );
    const pmApprovalRecord = deriveApprovalRecordAddress(
      paymentRequest,
      roleSeed.lowApprover
    );

    await expectError(
      program.methods
        .approveRequest({ lowApprover: {} }, "")
        .accounts({
          approver: pm.publicKey,
          project,
          workPackage,
          paymentRequest,
          approverRoleAssignment: pmRoleAssignment,
          approvalRecord: pmApprovalRecord,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([pm])
        .rpc(),
      "already in use"
    );
  });

  it("Director approves second", async () => {
    const directorRoleAssignment = roleAssignmentAddress(
      roleSeed.highApprover,
      director.publicKey
    );
    const directorApprovalRecord = deriveApprovalRecordAddress(
      paymentRequest,
      roleSeed.highApprover
    );

    await program.methods
      .approveRequest({ highApprover: {} }, "ipfs://director-note")
      .accounts({
        approver: director.publicKey,
        project,
        workPackage,
        paymentRequest,
        approverRoleAssignment: directorRoleAssignment,
        approvalRecord: directorApprovalRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([director])
      .rpc();

    const prAccount = await program.account.paymentRequestAccount.fetch(
      paymentRequest
    );
    assert.deepStrictEqual(prAccount.status, { highApproved: {} });

    const approvalAccount = await program.account.approvalRecord.fetch(
      directorApprovalRecord
    );
    assert.ok(approvalAccount.approver.equals(director.publicKey));
    assert.deepStrictEqual(approvalAccount.role, { highApprover: {} });
    assert.deepStrictEqual(approvalAccount.decision, { approved: {} });
  });

  it("PM can reject a submitted request", async () => {
    // Use a fresh package so it doesn't interfere with the main happy path.
    const rejectTestPackage = await createWorkPackageForTest(31);
    await program.methods
      .fundEscrow(new anchor.BN(200_000))
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: rejectTestPackage.workPackage,
        mint,
        financeTokenAccount,
        vault: rejectTestPackage.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const contractorRoleOnPkg31 = roleAssignmentAddressForPackage(
      rejectTestPackage.workPackage,
      roleSeed.contractor,
      contractor.publicKey
    );
    const pmRoleOnPkg31 = roleAssignmentAddressForPackage(
      rejectTestPackage.workPackage,
      roleSeed.lowApprover,
      pm.publicKey
    );
    await program.methods
      .assignRole({ contractor: {} }, contractor.publicKey)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: rejectTestPackage.workPackage,
        roleAssignment: contractorRoleOnPkg31,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    await program.methods
      .assignRole({ lowApprover: {} }, pm.publicKey)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage: rejectTestPackage.workPackage,
        roleAssignment: pmRoleOnPkg31,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const rejectTestRequest = derivePaymentRequestAddress(
      rejectTestPackage.workPackage,
      1
    );
    await program.methods
      .submitPaymentRequest(
        new anchor.BN(1),
        new anchor.BN(50_000),
        "ipfs://reject-test"
      )
      .accounts({
        contractor: contractor.publicKey,
        project,
        workPackage: rejectTestPackage.workPackage,
        contractorRoleAssignment: contractorRoleOnPkg31,
        paymentRequest: rejectTestRequest,
        vault: rejectTestPackage.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contractor])
      .rpc();

    const rejectApprovalRecord = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("approval"),
        rejectTestRequest.toBuffer(),
        Buffer.from([roleSeed.lowApprover]),
      ],
      program.programId
    )[0];

    await program.methods
      .rejectRequest({ lowApprover: {} }, "ipfs://rejection-note")
      .accounts({
        approver: pm.publicKey,
        project,
        workPackage: rejectTestPackage.workPackage,
        paymentRequest: rejectTestRequest,
        approverRoleAssignment: pmRoleOnPkg31,
        approvalRecord: rejectApprovalRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([pm])
      .rpc();

    const prAccount = await program.account.paymentRequestAccount.fetch(
      rejectTestRequest
    );
    assert.deepStrictEqual(prAccount.status, { rejected: {} });

    const wpAccount = await program.account.workPackageAccount.fetch(
      rejectTestPackage.workPackage
    );
    assert.isFalse(wpAccount.hasActiveRequest);
    assert.ok(wpAccount.activeRequest.equals(defaultPubkey));

    const approvalAccount = await program.account.approvalRecord.fetch(
      rejectApprovalRecord
    );
    assert.deepStrictEqual(approvalAccount.decision, { rejected: {} });
  });
});
