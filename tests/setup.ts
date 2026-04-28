import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Construkt } from "../target/types/construkt";

export const roleSeed = {
  contractor: 1,
  lowApprover: 2,
  highApprover: 3,
};

export const defaultPubkey = new anchor.web3.PublicKey(
  "11111111111111111111111111111111"
);

export const capAmount = new anchor.BN(1_000_000);
export const firstFundingAmount = new anchor.BN(600_000);

let fixtureCounter = 0;

export const u64Seed = (value: number) => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
};

export const expectError = async (
  action: Promise<unknown>,
  expected: string
) => {
  try {
    await action;
    assert.fail(`Expected transaction to fail with ${expected}`);
  } catch (error) {
    // Anchor program errors expose structured codes; runtime/account errors fall back to text.
    const anchorCode = (error as any)?.error?.errorCode?.code;
    if (anchorCode === expected) {
      return;
    }

    const errorText = String(error);
    assert.include(errorText, expected);
  }
};

export const createFixture = () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.construkt as Program<Construkt>;
  const finance = (provider.wallet as anchor.Wallet).payer;
  const contractor = anchor.web3.Keypair.generate();
  const pm = anchor.web3.Keypair.generate();
  const director = anchor.web3.Keypair.generate();
  const unrelatedUser = anchor.web3.Keypair.generate();
  const pm2 = anchor.web3.Keypair.generate();
  const projectId = Number(
    BigInt(Date.now()) * 1_000n + BigInt(fixtureCounter++)
  );

  let mint: anchor.web3.PublicKey;
  let financeTokenAccount: anchor.web3.PublicKey;
  let contractorTokenAccount: anchor.web3.PublicKey;
  let project: anchor.web3.PublicKey;

  const deriveProjectAddress = (authority: anchor.web3.PublicKey, id: number) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), authority.toBuffer(), u64Seed(id)],
      program.programId
    )[0];

  const deriveWorkPackageAddresses = (id: number) => {
    const [workPackage] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("work_package"), project.toBuffer(), u64Seed(id)],
      program.programId
    );
    const [vaultAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_authority"), workPackage.toBuffer()],
      program.programId
    );
    const vault = getAssociatedTokenAddressSync(mint, vaultAuthority, true);

    return { workPackage, vaultAuthority, vault };
  };

  const roleAssignmentAddressForPackage = (
    workPackage: anchor.web3.PublicKey,
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

  const derivePaymentRequestAddress = (
    workPackage: anchor.web3.PublicKey,
    requestId: number
  ) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_request"),
        workPackage.toBuffer(),
        u64Seed(requestId),
      ],
      program.programId
    )[0];

  const deriveApprovalRecordAddress = (
    paymentRequest: anchor.web3.PublicKey,
    roleByte: number
  ) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("approval"),
        paymentRequest.toBuffer(),
        Buffer.from([roleByte]),
      ],
      program.programId
    )[0];

  const init = async () => {
    for (const keypair of [contractor, pm, director, unrelatedUser, pm2]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          keypair.publicKey,
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
      3_000_000
    );
    contractorTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      finance,
      mint,
      contractor.publicKey
    );
    project = deriveProjectAddress(finance.publicKey, projectId);
  };

  const initializeProject = async (
    name = "Demo Hospital Fit-Out",
    metadataRef = "ipfs://project-metadata"
  ) => {
    await program.methods
      .initializeProject(new anchor.BN(projectId), name, metadataRef)
      .accountsStrict({
        authority: finance.publicKey,
        project,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  };

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
      .accountsStrict({
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

  const fundPackage = async (
    packageAddresses: {
      workPackage: anchor.web3.PublicKey;
      vault: anchor.web3.PublicKey;
    },
    amount = firstFundingAmount
  ) => {
    await program.methods
      .fundEscrow(amount)
      .accountsStrict({
        authority: finance.publicKey,
        project,
        workPackage: packageAddresses.workPackage,
        mint,
        financeTokenAccount,
        vault: packageAddresses.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  };

  const assignRole = async (
    packageAddresses: { workPackage: anchor.web3.PublicKey },
    role: any,
    roleByte: number,
    wallet: anchor.web3.PublicKey
  ) => {
    const roleAssignment = roleAssignmentAddressForPackage(
      packageAddresses.workPackage,
      roleByte,
      wallet
    );
    const opposingRoleByte =
      roleByte === roleSeed.lowApprover
        ? roleSeed.highApprover
        : roleByte === roleSeed.highApprover
        ? roleSeed.lowApprover
        : roleByte;
    const opposingApproverRoleAssignment = roleAssignmentAddressForPackage(
      packageAddresses.workPackage,
      opposingRoleByte,
      wallet
    );

    await program.methods
      .assignRole(role, wallet)
      .accountsStrict({
        authority: finance.publicKey,
        project,
        workPackage: packageAddresses.workPackage,
        roleAssignment,
        opposingApproverRoleAssignment,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return roleAssignment;
  };

  const assignDefaultRoles = async (packageAddresses: {
    workPackage: anchor.web3.PublicKey;
  }) => ({
    contractorRoleAssignment: await assignRole(
      packageAddresses,
      { contractor: {} },
      roleSeed.contractor,
      contractor.publicKey
    ),
    pmRoleAssignment: await assignRole(
      packageAddresses,
      { lowApprover: {} },
      roleSeed.lowApprover,
      pm.publicKey
    ),
    directorRoleAssignment: await assignRole(
      packageAddresses,
      { highApprover: {} },
      roleSeed.highApprover,
      director.publicKey
    ),
  });

  return {
    provider,
    program,
    finance,
    contractor,
    pm,
    director,
    unrelatedUser,
    pm2,
    projectId,
    get mint() {
      return mint;
    },
    get financeTokenAccount() {
      return financeTokenAccount;
    },
    get contractorTokenAccount() {
      return contractorTokenAccount;
    },
    get project() {
      return project;
    },
    init,
    initializeProject,
    deriveProjectAddress,
    deriveWorkPackageAddresses,
    roleAssignmentAddressForPackage,
    derivePaymentRequestAddress,
    deriveApprovalRecordAddress,
    createWorkPackageForTest,
    fundPackage,
    assignRole,
    assignDefaultRoles,
  };
};
