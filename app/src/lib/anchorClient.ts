import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { TransactionInstruction } from "@solana/web3.js";
import IDL_JSON from "../idl/construkt.json";
import {
  deriveApprovalRecordAddress,
  deriveMilestoneAddress,
  derivePaymentRequestAddress,
  deriveProjectDrafterAddress,
  deriveProjectAddress,
  deriveRoleAssignmentAddress,
  deriveVaultAuthorityAddress,
  deriveWorkPackageAddress,
  ROLE_BYTES,
} from "./pda";
import { ConstruktClientError } from "./program";
import type {
  AddDocumentReferenceParams,
  ApprovalRecord,
  ActivateAndFundWorkPackageParams,
  ActivateWorkPackageParams,
  ApproveRequestParams,
  AssignProjectDrafterParams,
  AssignRoleParams,
  ConstruktClient,
  ConstruktErrorCode,
  CreateDraftMilestoneParams,
  CreateMilestoneParams,
  CreatePackageDraftParams,
  CreateWorkPackageParams,
  Decision,
  Fetched,
  FundEscrowParams,
  InitializeProjectParams,
  MilestoneAccount,
  MilestoneStatus,
  PaymentRequestAccount,
  PaymentRequestStatus,
  PlaceHoldParams,
  ProjectAccount,
  ProjectDrafterAccount,
  ProjectStatus,
  RejectRequestParams,
  ReleasePaymentParams,
  SetDraftContractorParams,
  UpdateHighApprovalPolicyParams,
  RemoveHoldParams,
  Role,
  RoleAssignmentAccount,
  SetProjectDrafterActiveParams,
  SetRoleActiveParams,
  SubmitPaymentRequestParams,
  TxResult,
  WorkPackageAccount,
  WorkPackageStatus,
} from "./program";

interface RawProjectAccount {
  authority: PublicKey;
  projectId: BN;
  mint: PublicKey;
  budgetAmount: BN;
  allocatedAmount: BN;
  name: string;
  status: unknown;
  createdAt: BN;
  metadataRef: string;
  bump: number;
}

interface RawWorkPackageAccount {
  project: PublicKey;
  packageId: BN;
  capAmount: BN;
  fundedAmount: BN;
  releasedAmount: BN;
  reservedRequestAmount: BN;
  allocatedMilestoneAmount: BN;
  milestoneCounter: BN;
  contractor: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  vaultAuthorityBump: number;
  status: unknown;
  scopeRef: string;
  requestCounter: BN;
  hasActiveRequest: boolean;
  activeRequest: PublicKey;
  highApprovalRequired: boolean;
  bump: number;
}

interface RawMilestoneAccount {
  workPackage: PublicKey;
  milestoneId: BN;
  amount: BN;
  releasedAmount: BN;
  startAt: BN;
  endAt: BN;
  status: unknown;
  metadataRef: string;
  hasActiveRequest: boolean;
  activeRequest: PublicKey;
  bump: number;
}

interface RawRoleAssignmentAccount {
  workPackage: PublicKey;
  wallet: PublicKey;
  role: unknown;
  active: boolean;
  assignedBy: PublicKey;
  assignedAt: BN;
  updatedBy: PublicKey;
  updatedAt: BN;
  bump: number;
}

interface RawProjectDrafterAccount {
  project: PublicKey;
  wallet: PublicKey;
  active: boolean;
  assignedBy: PublicKey;
  assignedAt: BN;
  updatedBy: PublicKey;
  updatedAt: BN;
  bump: number;
}

interface RawPaymentRequestAccount {
  workPackage: PublicKey;
  requestId: BN;
  contractor: PublicKey;
  amount: BN;
  hasMilestone: boolean;
  milestone: PublicKey;
  documentRef: string;
  status: unknown;
  submittedAt: BN;
  updatedAt: BN;
  releasedAmount: BN;
  holdActive: boolean;
  holdBy: PublicKey;
  holdRef: string;
  bump: number;
}

interface RawApprovalRecord {
  paymentRequest: PublicKey;
  approver: PublicKey;
  role: unknown;
  decision: unknown;
  noteRef: string;
  createdAt: BN;
  bump: number;
}

interface MethodWithAccounts {
  accounts(accounts: Record<string, PublicKey>): MethodWithSigners;
}

interface MethodWithSigners {
  signers(signers: Keypair[]): MethodWithRpc;
  instruction(): Promise<TransactionInstruction>;
}

interface MethodWithRpc {
  rpc(): Promise<string>;
}

interface AccountFilter {
  memcmp: {
    offset: number;
    bytes: string;
  };
}

interface AccountClient<T> {
  fetch(address: PublicKey): Promise<T>;
  all(
    filters?: AccountFilter[],
  ): Promise<Array<{ publicKey: PublicKey; account: T }>>;
}

const ERROR_CODE_BY_NUMBER: Record<number, ConstruktErrorCode> = {
  6000: "Unauthorized",
  6001: "InvalidRole",
  6002: "InactiveRoleAssignment",
  6003: "RoleAlreadyInRequestedState",
  6004: "ApproverRoleConflict",
  6005: "InvalidAccountRelationship",
  6006: "InvalidStatus",
  6007: "InvalidApprovalOrder",
  6008: "ContractorCannotApprove",
  6009: "InvalidRequestId",
  6010: "ActiveRequestExists",
  6011: "MissingDocumentReference",
  6012: "DocumentReferenceUnchanged",
  6013: "StringTooLong",
  6014: "RequestOnHold",
  6015: "HoldNotActive",
  6016: "HoldAlreadyActive",
  6017: "RequestAlreadyReleased",
  6018: "InsufficientRemainingCap",
  6019: "InsufficientVaultBalance",
  6020: "WrongMint",
  6021: "WrongTokenOwner",
  6022: "ArithmeticOverflow",
  6023: "InvalidAmount",
  6024: "HighApprovalRequired",
};

const ERROR_CODE_SET = new Set<ConstruktErrorCode>([
  ...Object.values(ERROR_CODE_BY_NUMBER),
  "AccountNotInitialized",
]);

const toBn = (value: bigint): BN => new BN(value.toString());

const toBigInt = (value: BN): bigint => BigInt(value.toString());

const hasVariant = (raw: unknown, variant: string): boolean =>
  typeof raw === "object" && raw !== null && variant in raw;

const isConstruktErrorCode = (value: string): value is ConstruktErrorCode =>
  ERROR_CODE_SET.has(value as ConstruktErrorCode);

const mapAnchorError = (err: unknown): never => {
  const message = err instanceof Error ? err.message : String(err);
  if (/insufficient funds/i.test(message)) {
    throw new ConstruktClientError("InsufficientVaultBalance");
  }

  const top =
    typeof err === "object" && err !== null
      ? (err as Record<string, unknown>)
      : null;
  const anchorErr =
    top && typeof top.error === "object" && top.error !== null
      ? (top.error as Record<string, unknown>)
      : null;
  const errorCode =
    anchorErr &&
    typeof anchorErr.errorCode === "object" &&
    anchorErr.errorCode !== null
      ? (anchorErr.errorCode as Record<string, unknown>)
      : null;

  const code = errorCode?.code;
  if (typeof code === "string" && isConstruktErrorCode(code)) {
    throw new ConstruktClientError(code);
  }

  const number = errorCode?.number;
  if (typeof number === "number" && number in ERROR_CODE_BY_NUMBER) {
    throw new ConstruktClientError(ERROR_CODE_BY_NUMBER[number]);
  }

  throw err;
};

const toAnchorRole = (role: Role): Record<string, Record<string, never>> => {
  switch (role) {
    case "contractor":
      return { contractor: {} };
    case "lowApprover":
      return { lowApprover: {} };
    case "highApprover":
      return { highApprover: {} };
  }
};

const fromAnchorRole = (raw: unknown): Role => {
  if (hasVariant(raw, "contractor")) return "contractor";
  if (hasVariant(raw, "lowApprover")) return "lowApprover";
  return "highApprover";
};

const fromAnchorDecision = (raw: unknown): Decision => {
  if (hasVariant(raw, "approved")) return "approved";
  return "rejected";
};

const fromAnchorProjectStatus = (raw: unknown): ProjectStatus => {
  if (hasVariant(raw, "completed")) return "completed";
  if (hasVariant(raw, "cancelled")) return "cancelled";
  return "active";
};

const fromAnchorWpStatus = (raw: unknown): WorkPackageStatus => {
  if (hasVariant(raw, "completed")) return "completed";
  if (hasVariant(raw, "cancelled")) return "cancelled";
  if (hasVariant(raw, "draft")) return "draft";
  return "active";
};

const fromAnchorMilestoneStatus = (raw: unknown): MilestoneStatus => {
  if (hasVariant(raw, "completed")) return "completed";
  if (hasVariant(raw, "cancelled")) return "cancelled";
  return "active";
};

const fromAnchorPrStatus = (raw: unknown): PaymentRequestStatus => {
  if (hasVariant(raw, "submitted")) return "submitted";
  if (hasVariant(raw, "lowApproved")) return "lowApproved";
  if (hasVariant(raw, "highApproved")) return "highApproved";
  if (hasVariant(raw, "rejected")) return "rejected";
  return "released";
};

const fromRawProject = (raw: RawProjectAccount): ProjectAccount => ({
  authority: raw.authority,
  projectId: toBigInt(raw.projectId),
  mint: raw.mint,
  budgetAmount: toBigInt(raw.budgetAmount),
  allocatedAmount: toBigInt(raw.allocatedAmount),
  name: raw.name,
  status: fromAnchorProjectStatus(raw.status),
  createdAt: toBigInt(raw.createdAt),
  metadataRef: raw.metadataRef,
  bump: raw.bump,
});

const fromRawWorkPackage = (
  raw: RawWorkPackageAccount,
): WorkPackageAccount => ({
  project: raw.project,
  packageId: toBigInt(raw.packageId),
  capAmount: toBigInt(raw.capAmount),
  fundedAmount: toBigInt(raw.fundedAmount),
  releasedAmount: toBigInt(raw.releasedAmount),
  reservedRequestAmount: toBigInt(raw.reservedRequestAmount),
  allocatedMilestoneAmount: toBigInt(raw.allocatedMilestoneAmount),
  milestoneCounter: toBigInt(raw.milestoneCounter),
  contractor: raw.contractor,
  mint: raw.mint,
  vault: raw.vault,
  vaultAuthorityBump: raw.vaultAuthorityBump,
  status: fromAnchorWpStatus(raw.status),
  scopeRef: raw.scopeRef,
  requestCounter: toBigInt(raw.requestCounter),
  hasActiveRequest: raw.hasActiveRequest,
  activeRequest: raw.activeRequest,
  highApprovalRequired: raw.highApprovalRequired,
  bump: raw.bump,
});

const fromRawMilestone = (raw: RawMilestoneAccount): MilestoneAccount => ({
  workPackage: raw.workPackage,
  milestoneId: toBigInt(raw.milestoneId),
  amount: toBigInt(raw.amount),
  releasedAmount: toBigInt(raw.releasedAmount),
  startAt: toBigInt(raw.startAt),
  endAt: toBigInt(raw.endAt),
  status: fromAnchorMilestoneStatus(raw.status),
  metadataRef: raw.metadataRef,
  hasActiveRequest: raw.hasActiveRequest,
  activeRequest: raw.activeRequest,
  bump: raw.bump,
});

const fromRawRoleAssignment = (
  raw: RawRoleAssignmentAccount,
): RoleAssignmentAccount => ({
  workPackage: raw.workPackage,
  wallet: raw.wallet,
  role: fromAnchorRole(raw.role),
  active: raw.active,
  assignedBy: raw.assignedBy,
  assignedAt: toBigInt(raw.assignedAt),
  updatedBy: raw.updatedBy,
  updatedAt: toBigInt(raw.updatedAt),
  bump: raw.bump,
});

const fromRawProjectDrafter = (
  raw: RawProjectDrafterAccount,
): ProjectDrafterAccount => ({
  project: raw.project,
  wallet: raw.wallet,
  active: raw.active,
  assignedBy: raw.assignedBy,
  assignedAt: toBigInt(raw.assignedAt),
  updatedBy: raw.updatedBy,
  updatedAt: toBigInt(raw.updatedAt),
  bump: raw.bump,
});

const fromRawPaymentRequest = (
  raw: RawPaymentRequestAccount,
): PaymentRequestAccount => ({
  workPackage: raw.workPackage,
  requestId: toBigInt(raw.requestId),
  contractor: raw.contractor,
  amount: toBigInt(raw.amount),
  hasMilestone: raw.hasMilestone,
  milestone: raw.milestone,
  documentRef: raw.documentRef,
  status: fromAnchorPrStatus(raw.status),
  submittedAt: toBigInt(raw.submittedAt),
  updatedAt: toBigInt(raw.updatedAt),
  releasedAmount: toBigInt(raw.releasedAmount),
  holdActive: raw.holdActive,
  holdBy: raw.holdBy,
  holdRef: raw.holdRef,
  bump: raw.bump,
});

const fromRawApprovalRecord = (raw: RawApprovalRecord): ApprovalRecord => ({
  paymentRequest: raw.paymentRequest,
  approver: raw.approver,
  role: fromAnchorRole(raw.role),
  decision: fromAnchorDecision(raw.decision),
  noteRef: raw.noteRef,
  createdAt: toBigInt(raw.createdAt),
  bump: raw.bump,
});

const makeWallet = (keypair: Keypair) => ({
  publicKey: keypair.publicKey,
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T> {
    if ("partialSign" in tx) {
      tx.partialSign(keypair);
    } else {
      tx.sign([keypair]);
    }
    return Promise.resolve(tx);
  },
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]> {
    txs.forEach((tx) => {
      if ("partialSign" in tx) {
        tx.partialSign(keypair);
      } else {
        tx.sign([keypair]);
      }
    });
    return Promise.resolve(txs);
  },
});

export interface AnchorClientOptions {
  programId: PublicKey;
  connection: Connection;
  /** Demo signers: finance(1), pm(2), director(3), contractor(4), mint(10). */
  keypairs: Keypair[];
}

class AnchorConstruktClient implements ConstruktClient {
  private readonly programId: PublicKey;
  private readonly program: Program;
  private readonly defaultKeypair: Keypair;
  private readonly keypairMap: Map<string, Keypair>;

  constructor(opts: AnchorClientOptions) {
    if (opts.keypairs.length === 0) {
      throw new Error("Anchor client requires at least one signer keypair.");
    }

    this.programId = opts.programId;
    this.defaultKeypair = opts.keypairs[0]!;
    this.keypairMap = new Map(
      opts.keypairs.map((kp) => [kp.publicKey.toBase58(), kp]),
    );

    const provider = new AnchorProvider(
      opts.connection,
      makeWallet(this.defaultKeypair),
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      },
    );
    this.program = new Program(IDL_JSON, provider);

    if (!this.program.programId.equals(this.programId)) {
      throw new Error(
        `IDL program ID ${this.program.programId.toBase58()} does not match requested ${this.programId.toBase58()}.`,
      );
    }
  }

  async fetchProject(address: PublicKey): Promise<ProjectAccount | null> {
    try {
      const raw =
        await this.accountClient<RawProjectAccount>("projectAccount").fetch(
          address,
        );
      return fromRawProject(raw);
    } catch {
      return null;
    }
  }

  async fetchProjects(filter?: {
    authority?: PublicKey;
  }): Promise<Fetched<ProjectAccount>[]> {
    const filters = filter?.authority
      ? [{ memcmp: { offset: 8, bytes: filter.authority.toBase58() } }]
      : [];
    const rows =
      await this.accountClient<RawProjectAccount>("projectAccount").all(
        filters,
      );
    return rows.map(({ publicKey, account }) => ({
      address: publicKey,
      account: fromRawProject(account),
    }));
  }

  async fetchWorkPackage(
    address: PublicKey,
  ): Promise<WorkPackageAccount | null> {
    try {
      const raw =
        await this.accountClient<RawWorkPackageAccount>(
          "workPackageAccount",
        ).fetch(address);
      return fromRawWorkPackage(raw);
    } catch {
      return null;
    }
  }

  async fetchWorkPackagesForProject(
    project: PublicKey,
  ): Promise<Fetched<WorkPackageAccount>[]> {
    const rows = await this.accountClient<RawWorkPackageAccount>(
      "workPackageAccount",
    ).all([{ memcmp: { offset: 8, bytes: project.toBase58() } }]);
    return rows.map(({ publicKey, account }) => ({
      address: publicKey,
      account: fromRawWorkPackage(account),
    }));
  }

  async fetchMilestone(address: PublicKey): Promise<MilestoneAccount | null> {
    try {
      const raw =
        await this.accountClient<RawMilestoneAccount>("milestoneAccount").fetch(
          address,
        );
      return fromRawMilestone(raw);
    } catch {
      return null;
    }
  }

  async fetchMilestonesForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<MilestoneAccount>[]> {
    const rows = await this.accountClient<RawMilestoneAccount>(
      "milestoneAccount",
    ).all([{ memcmp: { offset: 8, bytes: workPackage.toBase58() } }]);
    return rows.map(({ publicKey, account }) => ({
      address: publicKey,
      account: fromRawMilestone(account),
    }));
  }

  async fetchRoleAssignment(
    address: PublicKey,
  ): Promise<RoleAssignmentAccount | null> {
    try {
      const raw = await this.accountClient<RawRoleAssignmentAccount>(
        "roleAssignmentAccount",
      ).fetch(address);
      return fromRawRoleAssignment(raw);
    } catch {
      return null;
    }
  }

  async fetchProjectDrafter(
    address: PublicKey,
  ): Promise<ProjectDrafterAccount | null> {
    try {
      const raw = await this.accountClient<RawProjectDrafterAccount>(
        "projectDrafterAccount",
      ).fetch(address);
      return fromRawProjectDrafter(raw);
    } catch {
      return null;
    }
  }

  async fetchProjectDraftersForProject(
    project: PublicKey,
  ): Promise<Fetched<ProjectDrafterAccount>[]> {
    const rows = await this.accountClient<RawProjectDrafterAccount>(
      "projectDrafterAccount",
    ).all([{ memcmp: { offset: 8, bytes: project.toBase58() } }]);
    return rows.map(({ publicKey, account }) => ({
      address: publicKey,
      account: fromRawProjectDrafter(account),
    }));
  }

  async fetchRoleAssignmentsForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<RoleAssignmentAccount>[]> {
    const rows = await this.accountClient<RawRoleAssignmentAccount>(
      "roleAssignmentAccount",
    ).all([{ memcmp: { offset: 8, bytes: workPackage.toBase58() } }]);
    return rows.map(({ publicKey, account }) => ({
      address: publicKey,
      account: fromRawRoleAssignment(account),
    }));
  }

  async fetchPaymentRequest(
    address: PublicKey,
  ): Promise<PaymentRequestAccount | null> {
    try {
      const raw = await this.accountClient<RawPaymentRequestAccount>(
        "paymentRequestAccount",
      ).fetch(address);
      return fromRawPaymentRequest(raw);
    } catch {
      return null;
    }
  }

  async fetchPaymentRequestsForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<PaymentRequestAccount>[]> {
    const rows = await this.accountClient<RawPaymentRequestAccount>(
      "paymentRequestAccount",
    ).all([{ memcmp: { offset: 8, bytes: workPackage.toBase58() } }]);
    return rows.map(({ publicKey, account }) => ({
      address: publicKey,
      account: fromRawPaymentRequest(account),
    }));
  }

  async fetchApprovalRecord(
    address: PublicKey,
  ): Promise<ApprovalRecord | null> {
    try {
      const raw =
        await this.accountClient<RawApprovalRecord>("approvalRecord").fetch(
          address,
        );
      return fromRawApprovalRecord(raw);
    } catch {
      return null;
    }
  }

  async fetchApprovalsForRequest(
    paymentRequest: PublicKey,
  ): Promise<Fetched<ApprovalRecord>[]> {
    const rows = await this.accountClient<RawApprovalRecord>(
      "approvalRecord",
    ).all([{ memcmp: { offset: 8, bytes: paymentRequest.toBase58() } }]);
    return rows.map(({ publicKey, account }) => ({
      address: publicKey,
      account: fromRawApprovalRecord(account),
    }));
  }

  async initializeProject(params: InitializeProjectParams): Promise<TxResult> {
    try {
      const project = deriveProjectAddress(
        this.programId,
        params.authority,
        params.projectId,
      );
      const signature = await this.method(
        "initializeProject",
        toBn(params.projectId),
        params.name,
        params.metadataRef,
        toBn(params.budgetAmount),
      )
        .accounts({
          authority: params.authority,
          project,
          mint: params.mint,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async createWorkPackage(params: CreateWorkPackageParams): Promise<TxResult> {
    try {
      const workPackage = deriveWorkPackageAddress(
        this.programId,
        params.project,
        params.packageId,
      );
      const vaultAuthority = deriveVaultAuthorityAddress(
        this.programId,
        workPackage,
      );
      const vault = getAssociatedTokenAddressSync(
        params.mint,
        vaultAuthority,
        true,
      );
      const signature = await this.method(
        "createWorkPackage",
        toBn(params.packageId),
        toBn(params.capAmount),
        params.contractor,
        params.scopeRef,
        params.highApprovalRequired ?? false,
      )
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage,
          vaultAuthority,
          mint: params.mint,
          vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async createMilestone(params: CreateMilestoneParams): Promise<TxResult> {
    try {
      const milestone = deriveMilestoneAddress(
        this.programId,
        params.workPackage,
        params.milestoneId,
      );
      const signature = await this.method(
        "createMilestone",
        toBn(params.milestoneId),
        toBn(params.amount),
        toBn(params.startAt),
        toBn(params.endAt),
        params.metadataRef,
      )
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          milestone,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async assignProjectDrafter(
    params: AssignProjectDrafterParams,
  ): Promise<TxResult> {
    try {
      const projectDrafter = deriveProjectDrafterAddress(
        this.programId,
        params.project,
        params.wallet,
      );
      const signature = await this.method("assignProjectDrafter", params.wallet)
        .accounts({
          authority: params.authority,
          project: params.project,
          projectDrafter,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async setProjectDrafterActive(
    params: SetProjectDrafterActiveParams,
  ): Promise<TxResult> {
    try {
      const signature = await this.method(
        "setProjectDrafterActive",
        params.active,
      )
        .accounts({
          authority: params.authority,
          project: params.project,
          projectDrafter: params.projectDrafter,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async createPackageDraft(
    params: CreatePackageDraftParams,
  ): Promise<TxResult> {
    try {
      const workPackage = deriveWorkPackageAddress(
        this.programId,
        params.project,
        params.packageId,
      );
      const projectDrafter = deriveProjectDrafterAddress(
        this.programId,
        params.project,
        params.drafter,
      );
      const signature = await this.method(
        "createPackageDraft",
        toBn(params.packageId),
        toBn(params.capAmount),
        params.contractor,
        params.scopeRef,
        params.highApprovalRequired ?? false,
      )
        .accounts({
          drafter: params.drafter,
          project: params.project,
          projectDrafter,
          workPackage,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.drafter))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async setDraftContractor(
    params: SetDraftContractorParams,
  ): Promise<TxResult> {
    try {
      const projectDrafter = deriveProjectDrafterAddress(
        this.programId,
        params.project,
        params.drafter,
      );
      const signature = await this.method(
        "setDraftContractor",
        params.contractor,
      )
        .accounts({
          drafter: params.drafter,
          project: params.project,
          projectDrafter,
          workPackage: params.workPackage,
        })
        .signers(this.extraSigners(params.drafter))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async createDraftMilestone(
    params: CreateDraftMilestoneParams,
  ): Promise<TxResult> {
    try {
      const projectDrafter = deriveProjectDrafterAddress(
        this.programId,
        params.project,
        params.drafter,
      );
      const milestone = deriveMilestoneAddress(
        this.programId,
        params.workPackage,
        params.milestoneId,
      );
      const signature = await this.method(
        "createDraftMilestone",
        toBn(params.milestoneId),
        toBn(params.amount),
        toBn(params.startAt),
        toBn(params.endAt),
        params.metadataRef,
      )
        .accounts({
          drafter: params.drafter,
          project: params.project,
          projectDrafter,
          workPackage: params.workPackage,
          milestone,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.drafter))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async activateWorkPackage(
    params: ActivateWorkPackageParams,
  ): Promise<TxResult> {
    try {
      const wp = await this.requireWorkPackage(params.workPackage);
      const vaultAuthority = deriveVaultAuthorityAddress(
        this.programId,
        params.workPackage,
      );
      const vault = getAssociatedTokenAddressSync(
        wp.mint,
        vaultAuthority,
        true,
      );
      const contractorRoleAssignment = deriveRoleAssignmentAddress(
        this.programId,
        params.workPackage,
        ROLE_BYTES.contractor,
        wp.contractor,
      );
      const signature = await this.method("activateWorkPackage")
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          vaultAuthority,
          mint: wp.mint,
          vault,
          contractorRoleAssignment,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async activateAndFundWorkPackage(
    params: ActivateAndFundWorkPackageParams,
  ): Promise<TxResult> {
    try {
      const wp = await this.requireWorkPackage(params.workPackage);
      const vaultAuthority = deriveVaultAuthorityAddress(
        this.programId,
        params.workPackage,
      );
      const vault = getAssociatedTokenAddressSync(
        wp.mint,
        vaultAuthority,
        true,
      );
      const contractorRoleAssignment = deriveRoleAssignmentAddress(
        this.programId,
        params.workPackage,
        ROLE_BYTES.contractor,
        wp.contractor,
      );
      const financeTokenAccount = getAssociatedTokenAddressSync(
        wp.mint,
        params.authority,
      );
      const approverRoleInstructions: TransactionInstruction[] = [];

      const addApproverRoleInstruction = async (
        role: "lowApprover" | "highApprover",
        wallet: PublicKey,
      ) => {
        const roleAssignment = deriveRoleAssignmentAddress(
          this.programId,
          params.workPackage,
          ROLE_BYTES[role],
          wallet,
        );
        const opposingRole =
          role === "lowApprover" ? "highApprover" : "lowApprover";
        const opposingApproverRoleAssignment = deriveRoleAssignmentAddress(
          this.programId,
          params.workPackage,
          ROLE_BYTES[opposingRole],
          wallet,
        );
        approverRoleInstructions.push(
          await this.method("assignRole", toAnchorRole(role), wallet)
            .accounts({
              authority: params.authority,
              project: params.project,
              workPackage: params.workPackage,
              roleAssignment,
              opposingApproverRoleAssignment,
              systemProgram: SystemProgram.programId,
            })
            .instruction(),
        );
      };

      if (params.lowApprover) {
        await addApproverRoleInstruction("lowApprover", params.lowApprover);
      }
      if (params.highApprover) {
        await addApproverRoleInstruction("highApprover", params.highApprover);
      }

      const activateIx = await this.method("activateWorkPackage")
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          vaultAuthority,
          mint: wp.mint,
          vault,
          contractorRoleAssignment,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const fundIx = await this.method("fundEscrow", toBn(params.amount))
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          mint: wp.mint,
          financeTokenAccount,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const signature = await (
        this.program.provider as AnchorProvider
      ).sendAndConfirm(
        new Transaction().add(activateIx, fundIx, ...approverRoleInstructions),
        this.extraSigners(params.authority),
      );
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async fundEscrow(params: FundEscrowParams): Promise<TxResult> {
    try {
      const wp = await this.requireWorkPackage(params.workPackage);
      const financeTokenAccount = getAssociatedTokenAddressSync(
        wp.mint,
        params.authority,
      );
      const signature = await this.method("fundEscrow", toBn(params.amount))
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          mint: wp.mint,
          financeTokenAccount,
          vault: wp.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async assignRole(params: AssignRoleParams): Promise<TxResult> {
    try {
      const roleAssignment = deriveRoleAssignmentAddress(
        this.programId,
        params.workPackage,
        ROLE_BYTES[params.role],
        params.wallet,
      );

      const opposingRole =
        params.role === "lowApprover"
          ? "highApprover"
          : params.role === "highApprover"
            ? "lowApprover"
            : null;
      const opposingApproverRoleAssignment = opposingRole
        ? deriveRoleAssignmentAddress(
            this.programId,
            params.workPackage,
            ROLE_BYTES[opposingRole],
            params.wallet,
          )
        : PublicKey.default;

      const signature = await this.method(
        "assignRole",
        toAnchorRole(params.role),
        params.wallet,
      )
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          roleAssignment,
          opposingApproverRoleAssignment,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async setRoleActive(params: SetRoleActiveParams): Promise<TxResult> {
    try {
      const signature = await this.method("setRoleActive", params.active)
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          roleAssignment: params.roleAssignment,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async submitPaymentRequest(
    params: SubmitPaymentRequestParams,
  ): Promise<TxResult> {
    try {
      const wp = await this.requireWorkPackage(params.workPackage);
      const contractorRoleAssignment = deriveRoleAssignmentAddress(
        this.programId,
        params.workPackage,
        ROLE_BYTES.contractor,
        params.contractor,
      );
      const paymentRequest = derivePaymentRequestAddress(
        this.programId,
        params.workPackage,
        params.requestId,
      );
      const milestone = params.milestone ?? params.workPackage;

      const signature = await this.method(
        "submitPaymentRequest",
        toBn(params.requestId),
        toBn(params.amount),
        params.documentRef,
        params.milestone !== undefined && params.milestone !== null,
      )
        .accounts({
          contractor: params.contractor,
          project: params.project,
          workPackage: params.workPackage,
          contractorRoleAssignment,
          paymentRequest,
          milestone,
          vault: wp.vault,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.contractor))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async addDocumentReference(
    params: AddDocumentReferenceParams,
  ): Promise<TxResult> {
    try {
      const contractorRoleAssignment = deriveRoleAssignmentAddress(
        this.programId,
        params.workPackage,
        ROLE_BYTES.contractor,
        params.contractor,
      );
      const signature = await this.method(
        "addDocumentReference",
        params.documentRef,
      )
        .accounts({
          contractor: params.contractor,
          project: params.project,
          workPackage: params.workPackage,
          paymentRequest: params.paymentRequest,
          contractorRoleAssignment,
        })
        .signers(this.extraSigners(params.contractor))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async approveRequest(params: ApproveRequestParams): Promise<TxResult> {
    try {
      const approverRoleAssignment = deriveRoleAssignmentAddress(
        this.programId,
        params.workPackage,
        ROLE_BYTES[params.role],
        params.approver,
      );
      const approvalRecord = deriveApprovalRecordAddress(
        this.programId,
        params.paymentRequest,
        ROLE_BYTES[params.role],
      );
      const signature = await this.method(
        "approveRequest",
        toAnchorRole(params.role),
        params.noteRef,
      )
        .accounts({
          approver: params.approver,
          project: params.project,
          workPackage: params.workPackage,
          paymentRequest: params.paymentRequest,
          approverRoleAssignment,
          approvalRecord,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.approver))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async rejectRequest(params: RejectRequestParams): Promise<TxResult> {
    try {
      const approverRoleAssignment = deriveRoleAssignmentAddress(
        this.programId,
        params.workPackage,
        ROLE_BYTES[params.role],
        params.approver,
      );
      const approvalRecord = deriveApprovalRecordAddress(
        this.programId,
        params.paymentRequest,
        ROLE_BYTES[params.role],
      );
      const paymentRequestAccount = await this.requirePaymentRequest(
        params.paymentRequest,
      );
      const milestone =
        paymentRequestAccount.hasMilestone &&
        !paymentRequestAccount.milestone.equals(PublicKey.default)
          ? paymentRequestAccount.milestone
          : params.workPackage;
      const signature = await this.method(
        "rejectRequest",
        toAnchorRole(params.role),
        params.noteRef,
      )
        .accounts({
          approver: params.approver,
          project: params.project,
          workPackage: params.workPackage,
          paymentRequest: params.paymentRequest,
          approverRoleAssignment,
          approvalRecord,
          milestone,
          systemProgram: SystemProgram.programId,
        })
        .signers(this.extraSigners(params.approver))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async placeHold(params: PlaceHoldParams): Promise<TxResult> {
    try {
      const signature = await this.method("placeHold", params.holdRef)
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          paymentRequest: params.paymentRequest,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async removeHold(params: RemoveHoldParams): Promise<TxResult> {
    try {
      const signature = await this.method("removeHold")
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          paymentRequest: params.paymentRequest,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async releasePayment(params: ReleasePaymentParams): Promise<TxResult> {
    try {
      const wp = await this.requireWorkPackage(params.workPackage);
      const paymentRequestAccount = await this.requirePaymentRequest(
        params.paymentRequest,
      );
      const vaultAuthority = deriveVaultAuthorityAddress(
        this.programId,
        params.workPackage,
      );
      const vault = getAssociatedTokenAddressSync(
        wp.mint,
        vaultAuthority,
        true,
      );
      const contractorTokenAccount = getAssociatedTokenAddressSync(
        wp.mint,
        wp.contractor,
      );
      const milestone =
        paymentRequestAccount.hasMilestone &&
        !paymentRequestAccount.milestone.equals(PublicKey.default)
          ? paymentRequestAccount.milestone
          : params.workPackage;

      const signature = await this.method("releasePayment")
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
          paymentRequest: params.paymentRequest,
          milestone,
          vaultAuthority,
          vault,
          contractorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  async updateHighApprovalPolicy(
    params: UpdateHighApprovalPolicyParams,
  ): Promise<TxResult> {
    try {
      const signature = await this.method(
        "updateHighApprovalPolicy",
        params.highApprovalRequired,
      )
        .accounts({
          authority: params.authority,
          project: params.project,
          workPackage: params.workPackage,
        })
        .signers(this.extraSigners(params.authority))
        .rpc();
      return { signature };
    } catch (err) {
      return mapAnchorError(err);
    }
  }

  private accountClient<T>(name: string): AccountClient<T> {
    const namespace = this.program.account as unknown as Record<
      string,
      AccountClient<T> | undefined
    >;
    const client = namespace[name];
    if (!client) {
      throw new Error(`IDL account namespace "${name}" is missing.`);
    }
    return client;
  }

  private method(name: string, ...args: unknown[]): MethodWithAccounts {
    const methods = this.program.methods as unknown as Record<
      string,
      ((...inputs: unknown[]) => MethodWithAccounts) | undefined
    >;
    const fn = methods[name];
    if (!fn) {
      throw new Error(`IDL method namespace "${name}" is missing.`);
    }
    return fn(...args);
  }

  private signerFor(pubkey: PublicKey): Keypair {
    const signer = this.keypairMap.get(pubkey.toBase58());
    if (!signer) {
      throw new Error(`No signer found for ${pubkey.toBase58()}`);
    }
    return signer;
  }

  private extraSigners(pubkey: PublicKey): Keypair[] {
    const signer = this.signerFor(pubkey);
    return signer.publicKey.equals(this.defaultKeypair.publicKey)
      ? []
      : [signer];
  }

  private async requireWorkPackage(
    address: PublicKey,
  ): Promise<WorkPackageAccount> {
    const wp = await this.fetchWorkPackage(address);
    if (!wp) {
      throw new Error(`Work package not found: ${address.toBase58()}`);
    }
    return wp;
  }

  private async requirePaymentRequest(
    address: PublicKey,
  ): Promise<PaymentRequestAccount> {
    const paymentRequest = await this.fetchPaymentRequest(address);
    if (!paymentRequest) {
      throw new Error(`Payment request not found: ${address.toBase58()}`);
    }
    return paymentRequest;
  }
}

export const createAnchorClient = (
  opts: AnchorClientOptions,
): ConstruktClient => new AnchorConstruktClient(opts);
