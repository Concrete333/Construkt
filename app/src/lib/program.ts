import { PublicKey } from "@solana/web3.js";

/**
 * TypeScript mirrors of the on-chain enums in `programs/construkt/src/lib.rs`.
 * Kept as string unions so they're cheap to compare and easy to render.
 */
export type ProjectStatus = "active" | "completed" | "cancelled";
export type WorkPackageStatus = "active" | "completed" | "cancelled" | "draft";
export type MilestoneStatus = "active" | "completed" | "cancelled";
export type PaymentRequestStatus =
  | "submitted"
  | "lowApproved"
  | "highApproved"
  | "rejected"
  | "released";
export type Role = "contractor" | "lowApprover" | "highApprover";
export type Decision = "approved" | "rejected";

/**
 * Account shapes mirror the Anchor `#[account]` structs in
 * `programs/construkt/src/lib.rs`. `u64`/`i64` are exposed as bigint so the
 * UI never has to deal with Anchor BN.
 */
export interface ProjectAccount {
  authority: PublicKey;
  projectId: bigint;
  mint: PublicKey;
  budgetAmount: bigint;
  allocatedAmount: bigint;
  name: string;
  status: ProjectStatus;
  createdAt: bigint;
  metadataRef: string;
  bump: number;
}

export interface WorkPackageAccount {
  project: PublicKey;
  packageId: bigint;
  capAmount: bigint;
  fundedAmount: bigint;
  releasedAmount: bigint;
  reservedRequestAmount: bigint;
  allocatedMilestoneAmount: bigint;
  milestoneCounter: bigint;
  contractor: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  vaultAuthorityBump: number;
  status: WorkPackageStatus;
  scopeRef: string;
  requestCounter: bigint;
  hasActiveRequest: boolean;
  activeRequest: PublicKey;
  bump: number;
}

export interface MilestoneAccount {
  workPackage: PublicKey;
  milestoneId: bigint;
  amount: bigint;
  releasedAmount: bigint;
  startAt: bigint;
  endAt: bigint;
  status: MilestoneStatus;
  metadataRef: string;
  hasActiveRequest: boolean;
  activeRequest: PublicKey;
  bump: number;
}

export interface RoleAssignmentAccount {
  workPackage: PublicKey;
  wallet: PublicKey;
  role: Role;
  active: boolean;
  assignedBy: PublicKey;
  assignedAt: bigint;
  updatedBy: PublicKey;
  updatedAt: bigint;
  bump: number;
}

export interface ProjectDrafterAccount {
  project: PublicKey;
  wallet: PublicKey;
  active: boolean;
  assignedBy: PublicKey;
  assignedAt: bigint;
  updatedBy: PublicKey;
  updatedAt: bigint;
  bump: number;
}

export interface PaymentRequestAccount {
  workPackage: PublicKey;
  requestId: bigint;
  contractor: PublicKey;
  amount: bigint;
  hasMilestone: boolean;
  milestone: PublicKey;
  documentRef: string;
  status: PaymentRequestStatus;
  submittedAt: bigint;
  updatedAt: bigint;
  releasedAmount: bigint;
  holdActive: boolean;
  holdBy: PublicKey;
  holdRef: string;
  bump: number;
}

export interface ApprovalRecord {
  paymentRequest: PublicKey;
  approver: PublicKey;
  role: Role;
  decision: Decision;
  noteRef: string;
  createdAt: bigint;
  bump: number;
}

/**
 * Wrapper for fetched accounts that also carries the address — mirrors what
 * Anchor's `program.account.<x>.all()` returns.
 */
export interface Fetched<T> {
  address: PublicKey;
  account: T;
}

/**
 * Every write returns the transaction signature. Real Anchor returns a base58
 * signature string; the mock returns a synthetic but unique one.
 */
export interface TxResult {
  signature: string;
}

// Instruction parameter types — one object per instruction.

export interface InitializeProjectParams {
  authority: PublicKey;
  projectId: bigint;
  mint: PublicKey;
  budgetAmount: bigint;
  name: string;
  metadataRef: string;
}

export interface CreateWorkPackageParams {
  authority: PublicKey;
  project: PublicKey;
  packageId: bigint;
  capAmount: bigint;
  contractor: PublicKey;
  mint: PublicKey;
  scopeRef: string;
}

export interface CreateMilestoneParams {
  authority: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  milestoneId: bigint;
  amount: bigint;
  startAt: bigint;
  endAt: bigint;
  metadataRef: string;
}

export interface AssignProjectDrafterParams {
  authority: PublicKey;
  project: PublicKey;
  wallet: PublicKey;
}

export interface SetProjectDrafterActiveParams {
  authority: PublicKey;
  project: PublicKey;
  projectDrafter: PublicKey;
  active: boolean;
}

export interface CreatePackageDraftParams {
  drafter: PublicKey;
  project: PublicKey;
  packageId: bigint;
  capAmount: bigint;
  contractor: PublicKey;
  scopeRef: string;
}

export interface CreateDraftMilestoneParams {
  drafter: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  milestoneId: bigint;
  amount: bigint;
  startAt: bigint;
  endAt: bigint;
  metadataRef: string;
}

export interface ActivateWorkPackageParams {
  authority: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
}

export interface FundEscrowParams {
  authority: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  amount: bigint;
}

export interface AssignRoleParams {
  authority: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  role: Role;
  wallet: PublicKey;
}

export interface SetRoleActiveParams {
  authority: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  roleAssignment: PublicKey;
  active: boolean;
}

export interface SubmitPaymentRequestParams {
  contractor: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  requestId: bigint;
  amount: bigint;
  milestone?: PublicKey | null;
  documentRef: string;
}

export interface AddDocumentReferenceParams {
  contractor: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  paymentRequest: PublicKey;
  documentRef: string;
}

export interface ApproveRequestParams {
  approver: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  paymentRequest: PublicKey;
  role: Extract<Role, "lowApprover" | "highApprover">;
  noteRef: string;
}

export interface RejectRequestParams {
  approver: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  paymentRequest: PublicKey;
  role: Extract<Role, "lowApprover" | "highApprover">;
  noteRef: string;
}

export interface PlaceHoldParams {
  authority: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  paymentRequest: PublicKey;
  holdRef: string;
}

export interface RemoveHoldParams {
  authority: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  paymentRequest: PublicKey;
}

export interface ReleasePaymentParams {
  authority: PublicKey;
  project: PublicKey;
  workPackage: PublicKey;
  paymentRequest: PublicKey;
  contractorTokenAccount: PublicKey;
}

/**
 * The single client surface that Phase 2 UI will talk to. The mock and the
 * future Anchor implementation both satisfy this interface so swapping the
 * runtime is a one-line change at the composition root.
 */
export interface ConstruktClient {
  // Reads -----------------------------------------------------------------

  fetchProject(address: PublicKey): Promise<ProjectAccount | null>;

  fetchProjects(filter?: {
    authority?: PublicKey;
  }): Promise<Fetched<ProjectAccount>[]>;

  fetchWorkPackage(address: PublicKey): Promise<WorkPackageAccount | null>;

  fetchWorkPackagesForProject(
    project: PublicKey,
  ): Promise<Fetched<WorkPackageAccount>[]>;

  fetchMilestone(address: PublicKey): Promise<MilestoneAccount | null>;

  fetchMilestonesForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<MilestoneAccount>[]>;

  fetchRoleAssignment(
    address: PublicKey,
  ): Promise<RoleAssignmentAccount | null>;

  fetchProjectDrafter(
    address: PublicKey,
  ): Promise<ProjectDrafterAccount | null>;

  fetchProjectDraftersForProject(
    project: PublicKey,
  ): Promise<Fetched<ProjectDrafterAccount>[]>;

  fetchRoleAssignmentsForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<RoleAssignmentAccount>[]>;

  fetchPaymentRequest(
    address: PublicKey,
  ): Promise<PaymentRequestAccount | null>;

  fetchPaymentRequestsForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<PaymentRequestAccount>[]>;

  fetchApprovalRecord(address: PublicKey): Promise<ApprovalRecord | null>;

  fetchApprovalsForRequest(
    paymentRequest: PublicKey,
  ): Promise<Fetched<ApprovalRecord>[]>;

  // Writes ----------------------------------------------------------------

  initializeProject(params: InitializeProjectParams): Promise<TxResult>;
  createWorkPackage(params: CreateWorkPackageParams): Promise<TxResult>;
  createMilestone(params: CreateMilestoneParams): Promise<TxResult>;
  assignProjectDrafter(params: AssignProjectDrafterParams): Promise<TxResult>;
  setProjectDrafterActive(
    params: SetProjectDrafterActiveParams,
  ): Promise<TxResult>;
  createPackageDraft(params: CreatePackageDraftParams): Promise<TxResult>;
  createDraftMilestone(params: CreateDraftMilestoneParams): Promise<TxResult>;
  activateWorkPackage(params: ActivateWorkPackageParams): Promise<TxResult>;
  fundEscrow(params: FundEscrowParams): Promise<TxResult>;
  assignRole(params: AssignRoleParams): Promise<TxResult>;
  setRoleActive(params: SetRoleActiveParams): Promise<TxResult>;
  submitPaymentRequest(params: SubmitPaymentRequestParams): Promise<TxResult>;
  addDocumentReference(params: AddDocumentReferenceParams): Promise<TxResult>;
  approveRequest(params: ApproveRequestParams): Promise<TxResult>;
  rejectRequest(params: RejectRequestParams): Promise<TxResult>;
  placeHold(params: PlaceHoldParams): Promise<TxResult>;
  removeHold(params: RemoveHoldParams): Promise<TxResult>;
  releasePayment(params: ReleasePaymentParams): Promise<TxResult>;
}

/**
 * Mirrors the on-chain `ConstruktError` enum so the mock and the Anchor
 * adapter throw the same code, and selectors can branch on it without a
 * regex over message strings.
 */
export type ConstruktErrorCode =
  | "AccountNotInitialized"
  | "Unauthorized"
  | "InvalidRole"
  | "InactiveRoleAssignment"
  | "RoleAlreadyInRequestedState"
  | "ApproverRoleConflict"
  | "InvalidAccountRelationship"
  | "InvalidStatus"
  | "InvalidApprovalOrder"
  | "ContractorCannotApprove"
  | "InvalidRequestId"
  | "ActiveRequestExists"
  | "MissingDocumentReference"
  | "DocumentReferenceUnchanged"
  | "StringTooLong"
  | "RequestOnHold"
  | "HoldNotActive"
  | "HoldAlreadyActive"
  | "RequestAlreadyReleased"
  | "InsufficientRemainingCap"
  | "InsufficientVaultBalance"
  | "WrongMint"
  | "WrongTokenOwner"
  | "ArithmeticOverflow"
  | "InvalidAmount";

export class ConstruktClientError extends Error {
  readonly code: ConstruktErrorCode;
  constructor(code: ConstruktErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "ConstruktClientError";
  }
}

const ERROR_MESSAGES: Record<ConstruktErrorCode, string> = {
  AccountNotInitialized:
    "Required setup is missing. Finance needs to authorize this role first.",
  Unauthorized: "This wallet is not authorized for that action.",
  InvalidRole: "The specified role is not valid for this account.",
  InactiveRoleAssignment: "Your role assignment on this package is inactive.",
  RoleAlreadyInRequestedState: "Role state is already what you requested.",
  ApproverRoleConflict:
    "The same wallet cannot hold both PM and high-approver roles on this package.",
  InvalidAccountRelationship:
    "Accounts don't match each other (project / package / request).",
  InvalidStatus: "The current request status doesn't allow that action.",
  InvalidApprovalOrder: "PM must approve before the high approver can.",
  ContractorCannotApprove:
    "The contractor wallet cannot approve their own request.",
  InvalidRequestId: "Request ID doesn't match the package's counter.",
  ActiveRequestExists:
    "Another payment request is already active on this package.",
  MissingDocumentReference: "A document reference is required.",
  DocumentReferenceUnchanged: "The document reference is unchanged.",
  StringTooLong: "One of the reference strings is too long.",
  RequestOnHold: "This request is currently on hold.",
  HoldNotActive: "There is no active hold to remove.",
  HoldAlreadyActive: "A hold is already active on this request.",
  RequestAlreadyReleased: "This request has already been released.",
  InsufficientRemainingCap:
    "Amount would exceed the remaining project or package cap.",
  InsufficientVaultBalance: "Escrow vault doesn't hold enough tokens.",
  WrongMint: "Token account uses the wrong mint.",
  WrongTokenOwner: "Token account is owned by an unexpected wallet.",
  ArithmeticOverflow: "Arithmetic overflow on amount math.",
  InvalidAmount: "Amount is invalid (zero or negative).",
};

/**
 * Convert a `ConstruktClientError` (or any error) into a short
 * user-facing sentence the UI can render verbatim. Unknown errors
 * fall back to the message text. This is the single chokepoint —
 * components should never branch on `code` themselves.
 */
export const friendlyClientError = (err: unknown): string => {
  if (err instanceof ConstruktClientError) return ERROR_MESSAGES[err.code];
  if (err instanceof Error) return err.message;
  return String(err);
};
