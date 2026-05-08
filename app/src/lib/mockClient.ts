import { PublicKey } from "@solana/web3.js";
import {
  deriveApprovalRecordAddress,
  derivePaymentRequestAddress,
  deriveProjectAddress,
  deriveRoleAssignmentAddress,
  deriveVaultAuthorityAddress,
  deriveWorkPackageAddress,
  ROLE_BYTES,
} from "./pda";
import type { RoleByte } from "./pda";
import { ConstruktClientError } from "./program";
import type {
  AddDocumentReferenceParams,
  ApprovalRecord,
  ApproveRequestParams,
  AssignRoleParams,
  ConstruktClient,
  CreateWorkPackageParams,
  Fetched,
  FundEscrowParams,
  InitializeProjectParams,
  PaymentRequestAccount,
  PlaceHoldParams,
  ProjectAccount,
  RejectRequestParams,
  ReleasePaymentParams,
  RemoveHoldParams,
  Role,
  RoleAssignmentAccount,
  SetRoleActiveParams,
  SubmitPaymentRequestParams,
  TxResult,
  WorkPackageAccount,
} from "./program";

const MAX_NAME_LEN = 64;
const MAX_REF_LEN = 128;
const MAX_NOTE_REF_LEN = 128;

const roleByteOf: Record<Role, RoleByte> = {
  contractor: ROLE_BYTES.contractor,
  lowApprover: ROLE_BYTES.lowApprover,
  highApprover: ROLE_BYTES.highApprover,
};

const opposingApprover = (role: Role): Role | null =>
  role === "lowApprover"
    ? "highApprover"
    : role === "highApprover"
      ? "lowApprover"
      : null;

const fail = (code: ConstruktClientError["code"], message?: string): never => {
  throw new ConstruktClientError(code, message);
};

export interface MockClientOptions {
  programId: PublicKey;
  /** Deterministic clock for tests; defaults to real time. */
  clock?: () => bigint;
}

/**
 * In-memory `ConstruktClient` for UI demos and selector tests. It enforces
 * the on-chain invariants the UI cares about (status flow, hold blocking,
 * single-active-request, contractor-cannot-approve, finance-only release)
 * so blocked-state branches in the UI light up the same way they will when
 * Phase 4 wires Anchor in.
 *
 * Token transfer side effects are tracked numerically — there are no real
 * SPL token accounts, mints, or balances. The mock therefore cannot catch
 * mint/ATA mismatches; the Anchor adapter will.
 */
export class MockConstruktClient implements ConstruktClient {
  private readonly programId: PublicKey;
  private readonly clock: () => bigint;
  private readonly projects = new Map<string, ProjectAccount>();
  private readonly workPackages = new Map<string, WorkPackageAccount>();
  private readonly roleAssignments = new Map<string, RoleAssignmentAccount>();
  private readonly paymentRequests = new Map<string, PaymentRequestAccount>();
  private readonly approvalRecords = new Map<string, ApprovalRecord>();
  private sigCounter = 0;

  constructor(opts: MockClientOptions) {
    this.programId = opts.programId;
    this.clock = opts.clock ?? (() => BigInt(Math.floor(Date.now() / 1000)));
  }

  // ---------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------

  async fetchProject(address: PublicKey): Promise<ProjectAccount | null> {
    return this.projects.get(address.toBase58()) ?? null;
  }

  async fetchProjects(filter?: {
    authority?: PublicKey;
  }): Promise<Fetched<ProjectAccount>[]> {
    const all = [...this.projects.entries()].map(([key, account]) => ({
      address: new PublicKey(key),
      account,
    }));
    if (!filter?.authority) return all;
    return all.filter((p) => p.account.authority.equals(filter.authority!));
  }

  async fetchWorkPackage(
    address: PublicKey,
  ): Promise<WorkPackageAccount | null> {
    return this.workPackages.get(address.toBase58()) ?? null;
  }

  async fetchWorkPackagesForProject(
    project: PublicKey,
  ): Promise<Fetched<WorkPackageAccount>[]> {
    return [...this.workPackages.entries()]
      .filter(([, account]) => account.project.equals(project))
      .map(([key, account]) => ({ address: new PublicKey(key), account }));
  }

  async fetchRoleAssignment(
    address: PublicKey,
  ): Promise<RoleAssignmentAccount | null> {
    return this.roleAssignments.get(address.toBase58()) ?? null;
  }

  async fetchRoleAssignmentsForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<RoleAssignmentAccount>[]> {
    return [...this.roleAssignments.entries()]
      .filter(([, account]) => account.workPackage.equals(workPackage))
      .map(([key, account]) => ({ address: new PublicKey(key), account }));
  }

  async fetchPaymentRequest(
    address: PublicKey,
  ): Promise<PaymentRequestAccount | null> {
    return this.paymentRequests.get(address.toBase58()) ?? null;
  }

  async fetchPaymentRequestsForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<PaymentRequestAccount>[]> {
    return [...this.paymentRequests.entries()]
      .filter(([, account]) => account.workPackage.equals(workPackage))
      .map(([key, account]) => ({ address: new PublicKey(key), account }));
  }

  async fetchApprovalRecord(
    address: PublicKey,
  ): Promise<ApprovalRecord | null> {
    return this.approvalRecords.get(address.toBase58()) ?? null;
  }

  async fetchApprovalsForRequest(
    paymentRequest: PublicKey,
  ): Promise<Fetched<ApprovalRecord>[]> {
    return [...this.approvalRecords.entries()]
      .filter(([, account]) => account.paymentRequest.equals(paymentRequest))
      .map(([key, account]) => ({ address: new PublicKey(key), account }));
  }

  // ---------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------

  async initializeProject(p: InitializeProjectParams): Promise<TxResult> {
    if (p.name.length > MAX_NAME_LEN) fail("StringTooLong");
    if (p.metadataRef.length > MAX_REF_LEN) fail("StringTooLong");

    const address = deriveProjectAddress(
      this.programId,
      p.authority,
      p.projectId,
    );
    if (this.projects.has(address.toBase58())) fail("InvalidStatus");

    const now = this.clock();
    this.projects.set(address.toBase58(), {
      authority: p.authority,
      projectId: p.projectId,
      name: p.name,
      status: "active",
      createdAt: now,
      metadataRef: p.metadataRef,
      bump: 255,
    });
    return this.tx();
  }

  async createWorkPackage(p: CreateWorkPackageParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    if (p.capAmount <= 0n) fail("InvalidAmount");
    if (p.contractor.equals(PublicKey.default))
      fail("InvalidAccountRelationship");
    if (p.scopeRef.length > MAX_REF_LEN) fail("StringTooLong");

    const wpAddress = deriveWorkPackageAddress(
      this.programId,
      p.project,
      p.packageId,
    );
    if (this.workPackages.has(wpAddress.toBase58())) fail("InvalidStatus");

    const vaultAuthority = deriveVaultAuthorityAddress(
      this.programId,
      wpAddress,
    );
    // The mock doesn't model SPL ATAs; the vault address is synthetic but stable.
    const vault = vaultAuthority;

    this.workPackages.set(wpAddress.toBase58(), {
      project: p.project,
      packageId: p.packageId,
      capAmount: p.capAmount,
      fundedAmount: 0n,
      releasedAmount: 0n,
      contractor: p.contractor,
      mint: p.mint,
      vault,
      vaultAuthorityBump: 255,
      status: "active",
      scopeRef: p.scopeRef,
      requestCounter: 0n,
      hasActiveRequest: false,
      activeRequest: PublicKey.default,
      bump: 255,
    });
    return this.tx();
  }

  async fundEscrow(p: FundEscrowParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    if (p.amount <= 0n) fail("InvalidAmount");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    const remaining = wp.capAmount - wp.fundedAmount;
    if (p.amount > remaining) fail("InsufficientRemainingCap");
    wp.fundedAmount += p.amount;
    return this.tx();
  }

  async assignRole(p: AssignRoleParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (p.wallet.equals(PublicKey.default)) fail("InvalidAccountRelationship");

    if (p.role === "contractor") {
      if (!p.wallet.equals(wp.contractor)) fail("InvalidAccountRelationship");
    } else {
      const opposing = opposingApprover(p.role);
      if (opposing) {
        const opposingAddress = deriveRoleAssignmentAddress(
          this.programId,
          p.workPackage,
          roleByteOf[opposing],
          p.wallet,
        );
        if (this.roleAssignments.has(opposingAddress.toBase58()))
          fail("ApproverRoleConflict");
      }
    }

    const address = deriveRoleAssignmentAddress(
      this.programId,
      p.workPackage,
      roleByteOf[p.role],
      p.wallet,
    );
    if (this.roleAssignments.has(address.toBase58())) fail("InvalidStatus");

    const now = this.clock();
    this.roleAssignments.set(address.toBase58(), {
      workPackage: p.workPackage,
      wallet: p.wallet,
      role: p.role,
      active: true,
      assignedBy: p.authority,
      assignedAt: now,
      updatedBy: p.authority,
      updatedAt: now,
      bump: 255,
    });
    return this.tx();
  }

  async setRoleActive(p: SetRoleActiveParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const ra = this.roleAssignments.get(p.roleAssignment.toBase58());
    if (!ra) fail("InvalidAccountRelationship");
    if (!ra!.workPackage.equals(p.workPackage))
      fail("InvalidAccountRelationship");
    if (ra!.active === p.active) fail("RoleAlreadyInRequestedState");
    ra!.active = p.active;
    ra!.updatedBy = p.authority;
    ra!.updatedAt = this.clock();
    return this.tx();
  }

  async submitPaymentRequest(p: SubmitPaymentRequestParams): Promise<TxResult> {
    if (p.amount <= 0n) fail("InvalidAmount");
    if (p.documentRef.length === 0) fail("MissingDocumentReference");
    if (p.documentRef.length > MAX_REF_LEN) fail("StringTooLong");

    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (wp.status !== "active") fail("InvalidStatus");
    if (wp.hasActiveRequest) fail("ActiveRequestExists");
    if (!wp.contractor.equals(p.contractor)) fail("Unauthorized");

    const contractorRoleAddress = deriveRoleAssignmentAddress(
      this.programId,
      p.workPackage,
      ROLE_BYTES.contractor,
      p.contractor,
    );
    const contractorRole = this.roleAssignments.get(
      contractorRoleAddress.toBase58(),
    );
    if (!contractorRole) fail("InvalidAccountRelationship");
    if (!contractorRole!.active) fail("InactiveRoleAssignment");

    const expectedRequestId = wp.requestCounter + 1n;
    if (p.requestId !== expectedRequestId) fail("InvalidRequestId");
    const remainingCap = wp.capAmount - wp.releasedAmount;
    if (p.amount > remainingCap) fail("InsufficientRemainingCap");
    const fundedRemaining = wp.fundedAmount - wp.releasedAmount;
    if (p.amount > fundedRemaining) fail("InsufficientVaultBalance");

    const address = derivePaymentRequestAddress(
      this.programId,
      p.workPackage,
      p.requestId,
    );
    const now = this.clock();
    this.paymentRequests.set(address.toBase58(), {
      workPackage: p.workPackage,
      requestId: p.requestId,
      contractor: p.contractor,
      amount: p.amount,
      documentRef: p.documentRef,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
      releasedAmount: 0n,
      holdActive: false,
      holdBy: PublicKey.default,
      holdRef: "",
      bump: 255,
    });
    wp.requestCounter = p.requestId;
    wp.hasActiveRequest = true;
    wp.activeRequest = address;
    return this.tx();
  }

  async addDocumentReference(p: AddDocumentReferenceParams): Promise<TxResult> {
    if (p.documentRef.length === 0) fail("MissingDocumentReference");
    if (p.documentRef.length > MAX_REF_LEN) fail("StringTooLong");
    const pr = this.requirePaymentRequest(p.paymentRequest);
    if (!pr.workPackage.equals(p.workPackage))
      fail("InvalidAccountRelationship");
    if (this.isTerminal(pr)) fail("InvalidStatus");
    if (pr.holdActive) fail("RequestOnHold");
    if (!pr.contractor.equals(p.contractor)) fail("Unauthorized");
    if (pr.documentRef === p.documentRef) fail("DocumentReferenceUnchanged");
    pr.documentRef = p.documentRef;
    pr.updatedAt = this.clock();
    return this.tx();
  }

  async approveRequest(p: ApproveRequestParams): Promise<TxResult> {
    return this.recordDecision(p, "approved");
  }

  async rejectRequest(p: RejectRequestParams): Promise<TxResult> {
    return this.recordDecision(p, "rejected");
  }

  async placeHold(p: PlaceHoldParams): Promise<TxResult> {
    if (p.holdRef.length > MAX_REF_LEN) fail("StringTooLong");
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const pr = this.requirePaymentRequest(p.paymentRequest);
    if (!pr.workPackage.equals(p.workPackage))
      fail("InvalidAccountRelationship");
    if (pr.status === "released") fail("RequestAlreadyReleased");
    if (this.isTerminal(pr)) fail("InvalidStatus");
    if (pr.holdActive) fail("HoldAlreadyActive");
    pr.holdActive = true;
    pr.holdBy = p.authority;
    pr.holdRef = p.holdRef;
    pr.updatedAt = this.clock();
    return this.tx();
  }

  async removeHold(p: RemoveHoldParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const pr = this.requirePaymentRequest(p.paymentRequest);
    if (!pr.workPackage.equals(p.workPackage))
      fail("InvalidAccountRelationship");
    if (!pr.holdActive) fail("HoldNotActive");
    pr.holdActive = false;
    pr.holdBy = PublicKey.default;
    pr.holdRef = "";
    pr.updatedAt = this.clock();
    return this.tx();
  }

  async releasePayment(p: ReleasePaymentParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    const pr = this.requirePaymentRequest(p.paymentRequest);
    if (!pr.workPackage.equals(p.workPackage))
      fail("InvalidAccountRelationship");
    if (pr.status === "released") fail("RequestAlreadyReleased");
    if (pr.status !== "lowApproved" && pr.status !== "highApproved")
      fail("InvalidStatus");
    if (wp.status !== "active") fail("InvalidStatus");
    if (pr.holdActive) fail("RequestOnHold");

    const remainingCap = wp.capAmount - wp.releasedAmount;
    if (pr.amount > remainingCap) fail("InsufficientRemainingCap");
    const fundedRemaining = wp.fundedAmount - wp.releasedAmount;
    if (pr.amount > fundedRemaining) fail("InsufficientVaultBalance");

    pr.status = "released";
    pr.releasedAmount = pr.amount;
    pr.updatedAt = this.clock();
    wp.releasedAmount += pr.amount;
    wp.hasActiveRequest = false;
    wp.activeRequest = PublicKey.default;
    if (wp.releasedAmount === wp.capAmount) wp.status = "completed";
    return this.tx();
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private async recordDecision(
    p: ApproveRequestParams | RejectRequestParams,
    decision: "approved" | "rejected",
  ): Promise<TxResult> {
    if (p.noteRef.length > MAX_NOTE_REF_LEN) fail("StringTooLong");
    if (p.role !== "lowApprover" && p.role !== "highApprover")
      fail("InvalidRole");
    const pr = this.requirePaymentRequest(p.paymentRequest);
    if (!pr.workPackage.equals(p.workPackage))
      fail("InvalidAccountRelationship");
    if (pr.contractor.equals(p.approver)) fail("ContractorCannotApprove");
    if (pr.holdActive) fail("RequestOnHold");
    if (this.isTerminal(pr)) fail("InvalidStatus");

    const approverRoleAddress = deriveRoleAssignmentAddress(
      this.programId,
      p.workPackage,
      roleByteOf[p.role],
      p.approver,
    );
    const approverRole = this.roleAssignments.get(
      approverRoleAddress.toBase58(),
    );
    if (!approverRole) fail("InvalidAccountRelationship");
    if (!approverRole!.active) fail("InactiveRoleAssignment");

    if (decision === "approved") {
      if (p.role === "lowApprover" && pr.status !== "submitted")
        fail("InvalidApprovalOrder");
      if (p.role === "highApprover" && pr.status !== "lowApproved")
        fail("InvalidApprovalOrder");
    }

    const recordAddress = deriveApprovalRecordAddress(
      this.programId,
      p.paymentRequest,
      roleByteOf[p.role],
    );
    if (this.approvalRecords.has(recordAddress.toBase58()))
      fail("InvalidStatus");

    const now = this.clock();
    this.approvalRecords.set(recordAddress.toBase58(), {
      paymentRequest: p.paymentRequest,
      approver: p.approver,
      role: p.role,
      decision,
      noteRef: p.noteRef,
      createdAt: now,
      bump: 255,
    });

    if (decision === "approved") {
      pr.status = p.role === "lowApprover" ? "lowApproved" : "highApproved";
    } else {
      pr.status = "rejected";
      const wp = this.workPackages.get(p.workPackage.toBase58());
      if (wp) {
        wp.hasActiveRequest = false;
        wp.activeRequest = PublicKey.default;
      }
    }
    pr.updatedAt = now;
    return this.tx();
  }

  private requireProject(address: PublicKey): ProjectAccount {
    const v = this.projects.get(address.toBase58());
    if (!v) fail("InvalidAccountRelationship");
    return v!;
  }

  private requireWorkPackage(address: PublicKey): WorkPackageAccount {
    const v = this.workPackages.get(address.toBase58());
    if (!v) fail("InvalidAccountRelationship");
    return v!;
  }

  private requirePaymentRequest(address: PublicKey): PaymentRequestAccount {
    const v = this.paymentRequests.get(address.toBase58());
    if (!v) fail("InvalidAccountRelationship");
    return v!;
  }

  private isTerminal(pr: PaymentRequestAccount): boolean {
    return pr.status === "rejected" || pr.status === "released";
  }

  private tx(): TxResult {
    this.sigCounter += 1;
    return { signature: `mock-sig-${this.sigCounter}` };
  }
}
