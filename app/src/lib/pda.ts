import { PublicKey } from "@solana/web3.js";

/**
 * Role byte constants used as the third seed of `RoleAssignment` PDAs and
 * the third seed of `ApprovalRecord` PDAs. Must match the values declared
 * in the on-chain program (`programs/construkt/src/lib.rs`).
 */
export const ROLE_BYTES = {
  contractor: 1,
  lowApprover: 2,
  highApprover: 3,
} as const;

export type RoleByte = (typeof ROLE_BYTES)[keyof typeof ROLE_BYTES];

const encoder = new TextEncoder();

const stringSeed = (value: string): Uint8Array => encoder.encode(value);

const u8Seed = (value: number): Uint8Array => Uint8Array.of(value);

export const u64Seed = (value: number | bigint): Uint8Array => {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(
    0,
    typeof value === "bigint" ? value : BigInt(value),
    true,
  );
  return buf;
};

export const deriveProjectAddress = (
  programId: PublicKey,
  authority: PublicKey,
  projectId: number | bigint,
): PublicKey =>
  PublicKey.findProgramAddressSync(
    [stringSeed("project"), authority.toBuffer(), u64Seed(projectId)],
    programId,
  )[0];

export const deriveWorkPackageAddress = (
  programId: PublicKey,
  project: PublicKey,
  packageId: number | bigint,
): PublicKey =>
  PublicKey.findProgramAddressSync(
    [stringSeed("work_package"), project.toBuffer(), u64Seed(packageId)],
    programId,
  )[0];

export const deriveVaultAuthorityAddress = (
  programId: PublicKey,
  workPackage: PublicKey,
): PublicKey =>
  PublicKey.findProgramAddressSync(
    [stringSeed("vault_authority"), workPackage.toBuffer()],
    programId,
  )[0];

export const deriveRoleAssignmentAddress = (
  programId: PublicKey,
  workPackage: PublicKey,
  roleByte: RoleByte,
  wallet: PublicKey,
): PublicKey =>
  PublicKey.findProgramAddressSync(
    [
      stringSeed("role"),
      workPackage.toBuffer(),
      u8Seed(roleByte),
      wallet.toBuffer(),
    ],
    programId,
  )[0];

export const derivePaymentRequestAddress = (
  programId: PublicKey,
  workPackage: PublicKey,
  requestId: number | bigint,
): PublicKey =>
  PublicKey.findProgramAddressSync(
    [stringSeed("payment_request"), workPackage.toBuffer(), u64Seed(requestId)],
    programId,
  )[0];

export const deriveMilestoneAddress = (
  programId: PublicKey,
  workPackage: PublicKey,
  milestoneId: number | bigint,
): PublicKey =>
  PublicKey.findProgramAddressSync(
    [stringSeed("milestone"), workPackage.toBuffer(), u64Seed(milestoneId)],
    programId,
  )[0];

export const deriveApprovalRecordAddress = (
  programId: PublicKey,
  paymentRequest: PublicKey,
  roleByte: RoleByte,
): PublicKey =>
  PublicKey.findProgramAddressSync(
    [stringSeed("approval"), paymentRequest.toBuffer(), u8Seed(roleByte)],
    programId,
  )[0];
