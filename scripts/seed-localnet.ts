import * as anchor from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
} from "@solana/spl-token";
import fs from "node:fs";
import path from "node:path";
import { packageScopeSlug } from "../app/src/lib/slug";

type SeedIdl = Idl & { address: string };

const loadIdl = (): SeedIdl => {
  const idlPath = path.resolve(__dirname, "../app/src/idl/construkt.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(
      "IDL is missing at app/src/idl/construkt.json. Run `anchor build` first."
    );
  }
  const parsed = JSON.parse(
    fs.readFileSync(idlPath, "utf8")
  ) as Partial<SeedIdl>;
  if (typeof parsed.address !== "string" || parsed.address.length === 0) {
    throw new Error(
      "IDL is missing its program address. Run `anchor build` first."
    );
  }
  return parsed as SeedIdl;
};

const IDL = loadIdl();
const PROGRAM_ID = new anchor.web3.PublicKey(IDL.address);
const RPC_URL = process.env.ANCHOR_RPC_URL ?? "http://localhost:8899";

const PROJECT_ID = 1;
const CAP_AMOUNT = 200_000_000;
const MINT_SUPPLY = 2_000_000_000;

const ROLE_BYTES = {
  contractor: 1,
  lowApprover: 2,
  highApprover: 3,
} as const;

const roleEnum = {
  contractor: { contractor: {} },
  lowApprover: { lowApprover: {} },
  highApprover: { highApprover: {} },
} as const;

const demoKeypair = (fillByte: number): anchor.web3.Keypair =>
  anchor.web3.Keypair.fromSeed(new Uint8Array(32).fill(fillByte));

const finance = demoKeypair(1);
const pm = demoKeypair(2);
const director = demoKeypair(3);
const contractor = demoKeypair(4);
const mintKeypair = demoKeypair(10);

const u64Seed = (value: number): Buffer => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
};

const deriveProjectAddress = (
  authority: anchor.web3.PublicKey,
  projectId: number
): anchor.web3.PublicKey =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("project"), authority.toBuffer(), u64Seed(projectId)],
    PROGRAM_ID
  )[0];

const deriveWorkPackageAddress = (
  project: anchor.web3.PublicKey,
  packageId: number
): anchor.web3.PublicKey =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("work_package"), project.toBuffer(), u64Seed(packageId)],
    PROGRAM_ID
  )[0];

const deriveVaultAuthorityAddress = (
  workPackage: anchor.web3.PublicKey
): anchor.web3.PublicKey =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_authority"), workPackage.toBuffer()],
    PROGRAM_ID
  )[0];

const deriveRoleAssignmentAddress = (
  workPackage: anchor.web3.PublicKey,
  roleByte: number,
  wallet: anchor.web3.PublicKey
): anchor.web3.PublicKey =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("role"),
      workPackage.toBuffer(),
      Buffer.from([roleByte]),
      wallet.toBuffer(),
    ],
    PROGRAM_ID
  )[0];

const derivePaymentRequestAddress = (
  workPackage: anchor.web3.PublicKey,
  requestId: number
): anchor.web3.PublicKey =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_request"),
      workPackage.toBuffer(),
      u64Seed(requestId),
    ],
    PROGRAM_ID
  )[0];

const deriveApprovalRecordAddress = (
  paymentRequest: anchor.web3.PublicKey,
  roleByte: number
): anchor.web3.PublicKey =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("approval"),
      paymentRequest.toBuffer(),
      Buffer.from([roleByte]),
    ],
    PROGRAM_ID
  )[0];

type SignableTransaction =
  | anchor.web3.Transaction
  | anchor.web3.VersionedTransaction;

const signTransaction = <T extends SignableTransaction>(
  tx: T,
  keypair: anchor.web3.Keypair
): T => {
  if (tx instanceof anchor.web3.VersionedTransaction) {
    tx.sign([keypair]);
  } else {
    tx.partialSign(keypair);
  }
  return tx;
};

const makeWallet = (keypair: anchor.web3.Keypair): anchor.Wallet => ({
  payer: keypair,
  publicKey: keypair.publicKey,
  signTransaction<T extends SignableTransaction>(tx: T): Promise<T> {
    return Promise.resolve(signTransaction(tx, keypair));
  },
  signAllTransactions<T extends SignableTransaction>(txs: T[]): Promise<T[]> {
    return Promise.resolve(txs.map((tx) => signTransaction(tx, keypair)));
  },
});

const noteRefFor = (slug: string): string => `metadata://demo/note/${slug}`;
const docRefFor = (slug: string): string => `metadata://demo/document/${slug}`;
const scopeRefFor = (slug: string): string => `metadata://demo/package/${slug}`;
const invoiceRefFor = (name: string, version: number): string =>
  docRefFor(`${packageScopeSlug(name)}-invoice-v${version}`);

const PACKAGE_NAMES = {
  foundation: "Foundation Pour Bay A",
  steelFrame: "Steel Frame Section B",
  mepFirstFix: "MEP First Fix",
  facade: "Facade Remediation",
  interior: "Interior Fit-Out",
  siteLogistics: "Site Logistics Variation",
} as const;

async function main() {
  const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(connection, makeWallet(finance), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);
  const program = new Program(IDL, provider);

  console.log("RPC:", RPC_URL);
  console.log("Program:", PROGRAM_ID.toBase58());
  console.log("Finance:", finance.publicKey.toBase58());
  console.log("PM:", pm.publicKey.toBase58());
  console.log("Director:", director.publicKey.toBase58());
  console.log("Contractor:", contractor.publicKey.toBase58());
  console.log("Mint seed wallet:", mintKeypair.publicKey.toBase58());

  for (const kp of [finance, pm, director, contractor]) {
    const sig = await connection.requestAirdrop(
      kp.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig, "confirmed");
  }

  const mint = await createMint(
    connection,
    finance,
    finance.publicKey,
    null,
    6,
    mintKeypair
  );
  const financeTokenAccount = await createAssociatedTokenAccount(
    connection,
    finance,
    mint,
    finance.publicKey
  );
  const contractorTokenAccount = await createAssociatedTokenAccount(
    connection,
    finance,
    mint,
    contractor.publicKey
  );
  await mintTo(
    connection,
    finance,
    mint,
    financeTokenAccount,
    finance,
    MINT_SUPPLY
  );

  const project = deriveProjectAddress(finance.publicKey, PROJECT_ID);
  await program.methods
    .initializeProject(
      new anchor.BN(PROJECT_ID),
      "Demo Hospital Fit-Out",
      "metadata://demo/project/hospital-fit-out"
    )
    .accounts({
      authority: finance.publicKey,
      project,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const setupPackage = async (
    packageId: number,
    packageName: string
  ): Promise<{
    workPackage: anchor.web3.PublicKey;
    paymentRequest: anchor.web3.PublicKey;
  }> => {
    const workPackage = deriveWorkPackageAddress(project, packageId);
    const vaultAuthority = deriveVaultAuthorityAddress(workPackage);
    const vault = getAssociatedTokenAddressSync(mint, vaultAuthority, true);
    const paymentRequest = derivePaymentRequestAddress(workPackage, 1);

    await program.methods
      .createWorkPackage(
        new anchor.BN(packageId),
        new anchor.BN(CAP_AMOUNT),
        contractor.publicKey,
        scopeRefFor(packageScopeSlug(packageName))
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

    await program.methods
      .fundEscrow(new anchor.BN(CAP_AMOUNT))
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

    const contractorRoleAssignment = deriveRoleAssignmentAddress(
      workPackage,
      ROLE_BYTES.contractor,
      contractor.publicKey
    );
    const pmRoleAssignment = deriveRoleAssignmentAddress(
      workPackage,
      ROLE_BYTES.lowApprover,
      pm.publicKey
    );
    const directorRoleAssignment = deriveRoleAssignmentAddress(
      workPackage,
      ROLE_BYTES.highApprover,
      director.publicKey
    );

    await program.methods
      .assignRole(roleEnum.contractor, contractor.publicKey)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage,
        roleAssignment: contractorRoleAssignment,
        opposingApproverRoleAssignment: anchor.web3.PublicKey.default,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .assignRole(roleEnum.lowApprover, pm.publicKey)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage,
        roleAssignment: pmRoleAssignment,
        opposingApproverRoleAssignment: deriveRoleAssignmentAddress(
          workPackage,
          ROLE_BYTES.highApprover,
          pm.publicKey
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .assignRole(roleEnum.highApprover, director.publicKey)
      .accounts({
        authority: finance.publicKey,
        project,
        workPackage,
        roleAssignment: directorRoleAssignment,
        opposingApproverRoleAssignment: deriveRoleAssignmentAddress(
          workPackage,
          ROLE_BYTES.lowApprover,
          director.publicKey
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return { workPackage, paymentRequest };
  };

  const submitRequest = async (
    workPackage: anchor.web3.PublicKey,
    packageName: string
  ) => {
    const paymentRequest = derivePaymentRequestAddress(workPackage, 1);
    const vaultAuthority = deriveVaultAuthorityAddress(workPackage);
    const vault = getAssociatedTokenAddressSync(mint, vaultAuthority, true);
    const contractorRoleAssignment = deriveRoleAssignmentAddress(
      workPackage,
      ROLE_BYTES.contractor,
      contractor.publicKey
    );

    await program.methods
      .submitPaymentRequest(
        new anchor.BN(1),
        new anchor.BN(CAP_AMOUNT),
        invoiceRefFor(packageName, 1)
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

    return paymentRequest;
  };

  const approve = async (
    workPackage: anchor.web3.PublicKey,
    paymentRequest: anchor.web3.PublicKey,
    role: "lowApprover" | "highApprover"
  ) => {
    const roleByte =
      role === "lowApprover" ? ROLE_BYTES.lowApprover : ROLE_BYTES.highApprover;
    const approver = role === "lowApprover" ? pm : director;
    const approverRoleAssignment = deriveRoleAssignmentAddress(
      workPackage,
      roleByte,
      approver.publicKey
    );
    const approvalRecord = deriveApprovalRecordAddress(
      paymentRequest,
      roleByte
    );
    await program.methods
      .approveRequest(roleEnum[role], noteRefFor(`${role}-approve`))
      .accounts({
        approver: approver.publicKey,
        project,
        workPackage,
        paymentRequest,
        approverRoleAssignment,
        approvalRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([approver])
      .rpc();
  };

  const rejectByPm = async (
    workPackage: anchor.web3.PublicKey,
    paymentRequest: anchor.web3.PublicKey
  ) => {
    const approverRoleAssignment = deriveRoleAssignmentAddress(
      workPackage,
      ROLE_BYTES.lowApprover,
      pm.publicKey
    );
    const approvalRecord = deriveApprovalRecordAddress(
      paymentRequest,
      ROLE_BYTES.lowApprover
    );
    await program.methods
      .rejectRequest(roleEnum.lowApprover, noteRefFor("pm-reject"))
      .accounts({
        approver: pm.publicKey,
        project,
        workPackage,
        paymentRequest,
        approverRoleAssignment,
        approvalRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([pm])
      .rpc();
  };

  // 1) Foundation: released after PM plus optional high approval
  const foundation = await setupPackage(1, PACKAGE_NAMES.foundation);
  const foundationRequest = await submitRequest(
    foundation.workPackage,
    PACKAGE_NAMES.foundation
  );
  await approve(foundation.workPackage, foundationRequest, "lowApprover");
  await approve(foundation.workPackage, foundationRequest, "highApprover");
  const foundationVaultAuthority = deriveVaultAuthorityAddress(
    foundation.workPackage
  );
  const foundationVault = getAssociatedTokenAddressSync(
    mint,
    foundationVaultAuthority,
    true
  );
  await program.methods
    .releasePayment()
    .accounts({
      authority: finance.publicKey,
      project,
      workPackage: foundation.workPackage,
      paymentRequest: foundationRequest,
      vaultAuthority: foundationVaultAuthority,
      vault: foundationVault,
      contractorTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  // 2) Steel: high-approved via optional high step, waiting on finance release
  const steel = await setupPackage(2, PACKAGE_NAMES.steelFrame);
  const steelRequest = await submitRequest(
    steel.workPackage,
    PACKAGE_NAMES.steelFrame
  );
  await approve(steel.workPackage, steelRequest, "lowApprover");
  await approve(steel.workPackage, steelRequest, "highApprover");

  // 3) MEP: low-approved
  const mep = await setupPackage(3, PACKAGE_NAMES.mepFirstFix);
  const mepRequest = await submitRequest(
    mep.workPackage,
    PACKAGE_NAMES.mepFirstFix
  );
  await approve(mep.workPackage, mepRequest, "lowApprover");

  // 4) Facade: submitted + hold
  const facade = await setupPackage(4, PACKAGE_NAMES.facade);
  const facadeRequest = await submitRequest(
    facade.workPackage,
    PACKAGE_NAMES.facade
  );
  await program.methods
    .placeHold(noteRefFor("facade-hold"))
    .accounts({
      authority: finance.publicKey,
      project,
      workPackage: facade.workPackage,
      paymentRequest: facadeRequest,
    })
    .rpc();

  // 5) Interior: funded + no request
  await setupPackage(5, PACKAGE_NAMES.interior);

  // 6) Site logistics: rejected
  const site = await setupPackage(6, PACKAGE_NAMES.siteLogistics);
  const siteRequest = await submitRequest(
    site.workPackage,
    PACKAGE_NAMES.siteLogistics
  );
  await rejectByPm(site.workPackage, siteRequest);

  console.log("");
  console.log("Seed complete.");
  console.log("Project:", project.toBase58());
  console.log("Mint:", mint.toBase58());
  console.log("Contractor ATA:", contractorTokenAccount.toBase58());
}

void main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
