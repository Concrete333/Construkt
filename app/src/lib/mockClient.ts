import { PublicKey } from "@solana/web3.js";
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
import type { RoleByte } from "./pda";
import { ConstruktClientError } from "./program";
import type {
  AddDocumentReferenceParams,
  ActivateAndFundWorkPackageParams,
  ActivateWorkPackageParams,
  ApprovalRecord,
  ApproveRequestParams,
  AssignProjectDrafterParams,
  AssignRoleParams,
  ConstruktClient,
  CreateDraftMilestoneParams,
  CreateMilestoneParams,
  CreatePackageDraftParams,
  CreateWorkPackageParams,
  Fetched,
  FundEscrowParams,
  InitializeProjectParams,
  MilestoneAccount,
  PaymentRequestAccount,
  PlaceHoldParams,
  ProjectAccount,
  ProjectDrafterAccount,
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
 * so blocked-state branches in the UI light up the same way they do in
 * Anchor mode.
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
  private readonly milestones = new Map<string, MilestoneAccount>();
  private readonly projectDrafters = new Map<string, ProjectDrafterAccount>();
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

  async fetchMilestone(address: PublicKey): Promise<MilestoneAccount | null> {
    return this.milestones.get(address.toBase58()) ?? null;
  }

  async fetchMilestonesForPackage(
    workPackage: PublicKey,
  ): Promise<Fetched<MilestoneAccount>[]> {
    return [...this.milestones.entries()]
      .filter(([, account]) => account.workPackage.equals(workPackage))
      .map(([key, account]) => ({ address: new PublicKey(key), account }));
  }

  async fetchRoleAssignment(
    address: PublicKey,
  ): Promise<RoleAssignmentAccount | null> {
    return this.roleAssignments.get(address.toBase58()) ?? null;
  }

  async fetchProjectDrafter(
    address: PublicKey,
  ): Promise<ProjectDrafterAccount | null> {
    return this.projectDrafters.get(address.toBase58()) ?? null;
  }

  async fetchProjectDraftersForProject(
    project: PublicKey,
  ): Promise<Fetched<ProjectDrafterAccount>[]> {
    return [...this.projectDrafters.entries()]
      .filter(([, account]) => account.project.equals(project))
      .map(([key, account]) => ({ address: new PublicKey(key), account }));
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
    if (p.budgetAmount <= 0n) fail("InvalidAmount");

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
      mint: p.mint,
      budgetAmount: p.budgetAmount,
      allocatedAmount: 0n,
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
    // Mint check is an account-level constraint on chain, so it fires before
    // any body-level check including `cap_amount > 0`. Mirror that order here
    // so mock and Anchor return the same code on overlapping validation
    // failures (e.g. cap=0 + wrongMint -> WrongMint, not InvalidAmount).
    if (!p.mint.equals(project.mint)) fail("WrongMint");
    if (p.capAmount <= 0n) fail("InvalidAmount");
    if (p.contractor.equals(PublicKey.default))
      fail("InvalidAccountRelationship");
    if (p.scopeRef.length > MAX_REF_LEN) fail("StringTooLong");
    const remainingAllocatable = project.budgetAmount - project.allocatedAmount;
    if (p.capAmount > remainingAllocatable) fail("InsufficientRemainingCap");

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
      reservedRequestAmount: 0n,
      allocatedMilestoneAmount: 0n,
      milestoneCounter: 0n,
      contractor: p.contractor,
      mint: p.mint,
      vault,
      vaultAuthorityBump: 255,
      status: "active",
      scopeRef: p.scopeRef,
      requestCounter: 0n,
      hasActiveRequest: false,
      activeRequest: PublicKey.default,
      highApprovalRequired: p.highApprovalRequired ?? false,
      bump: 255,
    });
    project.allocatedAmount += p.capAmount;
    return this.tx();
  }

  async createMilestone(p: CreateMilestoneParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (wp.status !== "active") fail("InvalidStatus");
    if (p.amount <= 0n) fail("InvalidAmount");
    if (p.startAt >= p.endAt) fail("InvalidStatus");
    if (p.metadataRef.length > MAX_REF_LEN) fail("StringTooLong");
    if (wp.requestCounter !== 0n) fail("InvalidStatus");
    if (wp.fundedAmount !== 0n) fail("InvalidStatus");

    const nextMilestoneId = wp.milestoneCounter + 1n;
    if (p.milestoneId !== nextMilestoneId) fail("InvalidRequestId");
    const remainingMilestoneAllocation =
      wp.capAmount - wp.allocatedMilestoneAmount;
    if (p.amount > remainingMilestoneAllocation)
      fail("InsufficientRemainingCap");

    const address = deriveMilestoneAddress(
      this.programId,
      p.workPackage,
      p.milestoneId,
    );
    if (this.milestones.has(address.toBase58())) fail("InvalidStatus");

    this.milestones.set(address.toBase58(), {
      workPackage: p.workPackage,
      milestoneId: p.milestoneId,
      amount: p.amount,
      releasedAmount: 0n,
      startAt: p.startAt,
      endAt: p.endAt,
      status: "active",
      metadataRef: p.metadataRef,
      hasActiveRequest: false,
      activeRequest: PublicKey.default,
      bump: 255,
    });
    wp.allocatedMilestoneAmount += p.amount;
    wp.milestoneCounter = p.milestoneId;
    return this.tx();
  }

  async assignProjectDrafter(p: AssignProjectDrafterParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    if (p.wallet.equals(PublicKey.default)) fail("InvalidAccountRelationship");

    const address = deriveProjectDrafterAddress(
      this.programId,
      p.project,
      p.wallet,
    );
    if (this.projectDrafters.has(address.toBase58())) fail("InvalidStatus");
    const now = this.clock();
    this.projectDrafters.set(address.toBase58(), {
      project: p.project,
      wallet: p.wallet,
      active: true,
      assignedBy: p.authority,
      assignedAt: now,
      updatedBy: p.authority,
      updatedAt: now,
      bump: 255,
    });
    return this.tx();
  }

  async setProjectDrafterActive(
    p: SetProjectDrafterActiveParams,
  ): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const drafter =
      this.projectDrafters.get(p.projectDrafter.toBase58()) ??
      fail("AccountNotInitialized");
    if (!drafter.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (drafter.active === p.active) fail("RoleAlreadyInRequestedState");
    drafter.active = p.active;
    drafter.updatedBy = p.authority;
    drafter.updatedAt = this.clock();
    return this.tx();
  }

  async createPackageDraft(p: CreatePackageDraftParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    const drafter =
      this.projectDrafters.get(
        deriveProjectDrafterAddress(
          this.programId,
          p.project,
          p.drafter,
        ).toBase58(),
      ) ?? fail("AccountNotInitialized");
    if (!drafter.wallet.equals(p.drafter)) fail("Unauthorized");
    if (!drafter.active) fail("InactiveRoleAssignment");
    if (p.capAmount <= 0n) fail("InvalidAmount");
    if (p.scopeRef.length > MAX_REF_LEN) fail("StringTooLong");

    const wpAddress = deriveWorkPackageAddress(
      this.programId,
      p.project,
      p.packageId,
    );
    if (this.workPackages.has(wpAddress.toBase58())) fail("InvalidStatus");

    this.workPackages.set(wpAddress.toBase58(), {
      project: p.project,
      packageId: p.packageId,
      capAmount: p.capAmount,
      fundedAmount: 0n,
      releasedAmount: 0n,
      reservedRequestAmount: 0n,
      allocatedMilestoneAmount: 0n,
      milestoneCounter: 0n,
      contractor: p.contractor,
      mint: project.mint,
      vault: PublicKey.default,
      vaultAuthorityBump: 0,
      status: "draft",
      scopeRef: p.scopeRef,
      requestCounter: 0n,
      hasActiveRequest: false,
      activeRequest: PublicKey.default,
      highApprovalRequired: p.highApprovalRequired ?? false,
      bump: 255,
    });
    return this.tx();
  }

  async setDraftContractor(p: SetDraftContractorParams): Promise<TxResult> {
    const drafter =
      this.projectDrafters.get(
        deriveProjectDrafterAddress(
          this.programId,
          p.project,
          p.drafter,
        ).toBase58(),
      ) ?? fail("AccountNotInitialized");
    if (!drafter.wallet.equals(p.drafter)) fail("Unauthorized");
    if (!drafter.active) fail("InactiveRoleAssignment");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (wp.status !== "draft") fail("InvalidStatus");
    if (p.contractor.equals(PublicKey.default))
      fail("InvalidAccountRelationship");
    if (wp.contractor.equals(p.contractor)) fail("RoleAlreadyInRequestedState");
    wp.contractor = p.contractor;
    return this.tx();
  }

  async createDraftMilestone(p: CreateDraftMilestoneParams): Promise<TxResult> {
    const drafter =
      this.projectDrafters.get(
        deriveProjectDrafterAddress(
          this.programId,
          p.project,
          p.drafter,
        ).toBase58(),
      ) ?? fail("AccountNotInitialized");
    if (!drafter.wallet.equals(p.drafter)) fail("Unauthorized");
    if (!drafter.active) fail("InactiveRoleAssignment");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (wp.status !== "draft") fail("InvalidStatus");
    if (p.amount <= 0n) fail("InvalidAmount");
    if (p.startAt >= p.endAt) fail("InvalidStatus");
    if (p.metadataRef.length > MAX_REF_LEN) fail("StringTooLong");
    if (wp.requestCounter !== 0n) fail("InvalidStatus");
    if (wp.fundedAmount !== 0n) fail("InvalidStatus");

    const nextMilestoneId = wp.milestoneCounter + 1n;
    if (p.milestoneId !== nextMilestoneId) fail("InvalidRequestId");
    const remainingMilestoneAllocation =
      wp.capAmount - wp.allocatedMilestoneAmount;
    if (p.amount > remainingMilestoneAllocation)
      fail("InsufficientRemainingCap");

    const address = deriveMilestoneAddress(
      this.programId,
      p.workPackage,
      p.milestoneId,
    );
    if (this.milestones.has(address.toBase58())) fail("InvalidStatus");

    this.milestones.set(address.toBase58(), {
      workPackage: p.workPackage,
      milestoneId: p.milestoneId,
      amount: p.amount,
      releasedAmount: 0n,
      startAt: p.startAt,
      endAt: p.endAt,
      status: "active",
      metadataRef: p.metadataRef,
      hasActiveRequest: false,
      activeRequest: PublicKey.default,
      bump: 255,
    });
    wp.allocatedMilestoneAmount += p.amount;
    wp.milestoneCounter = p.milestoneId;
    return this.tx();
  }

  async activateWorkPackage(p: ActivateWorkPackageParams): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (wp.status !== "draft") fail("InvalidStatus");
    if (wp.contractor.equals(PublicKey.default))
      fail("InvalidAccountRelationship");
    if (
      wp.milestoneCounter > 0n &&
      wp.allocatedMilestoneAmount !== wp.capAmount
    )
      fail("InvalidStatus");
    const remainingAllocatable = project.budgetAmount - project.allocatedAmount;
    if (wp.capAmount > remainingAllocatable) fail("InsufficientRemainingCap");

    const vaultAuthority = deriveVaultAuthorityAddress(
      this.programId,
      p.workPackage,
    );
    wp.vault = vaultAuthority;
    wp.vaultAuthorityBump = 255;
    wp.status = "active";
    project.allocatedAmount += wp.capAmount;

    const roleAssignment = deriveRoleAssignmentAddress(
      this.programId,
      p.workPackage,
      ROLE_BYTES.contractor,
      wp.contractor,
    );
    const now = this.clock();
    this.roleAssignments.set(roleAssignment.toBase58(), {
      workPackage: p.workPackage,
      wallet: wp.contractor,
      role: "contractor",
      active: true,
      assignedBy: p.authority,
      assignedAt: now,
      updatedBy: p.authority,
      updatedAt: now,
      bump: 255,
    });
    return this.tx();
  }

  async activateAndFundWorkPackage(
    p: ActivateAndFundWorkPackageParams,
  ): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    if (p.amount <= 0n) fail("InvalidAmount");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (wp.status !== "draft") fail("InvalidStatus");
    if (wp.contractor.equals(PublicKey.default))
      fail("InvalidAccountRelationship");
    if (
      wp.milestoneCounter > 0n &&
      wp.allocatedMilestoneAmount !== wp.capAmount
    )
      fail("InvalidStatus");
    const remainingAllocatable = project.budgetAmount - project.allocatedAmount;
    if (wp.capAmount > remainingAllocatable) fail("InsufficientRemainingCap");
    if (p.amount > wp.capAmount) fail("InsufficientRemainingCap");

    const vaultAuthority = deriveVaultAuthorityAddress(
      this.programId,
      p.workPackage,
    );
    wp.vault = vaultAuthority;
    wp.vaultAuthorityBump = 255;
    wp.status = "active";
    wp.fundedAmount += p.amount;
    project.allocatedAmount += wp.capAmount;

    const roleAssignment = deriveRoleAssignmentAddress(
      this.programId,
      p.workPackage,
      ROLE_BYTES.contractor,
      wp.contractor,
    );
    const now = this.clock();
    this.roleAssignments.set(roleAssignment.toBase58(), {
      workPackage: p.workPackage,
      wallet: wp.contractor,
      role: "contractor",
      active: true,
      assignedBy: p.authority,
      assignedAt: now,
      updatedBy: p.authority,
      updatedAt: now,
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
    if (wp.status !== "active") fail("InvalidStatus");
    if (
      wp.milestoneCounter > 0n &&
      wp.allocatedMilestoneAmount !== wp.capAmount
    )
      fail("InvalidStatus");
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
    if (wp.status !== "active") fail("InvalidStatus");
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
    const fundedRemaining =
      wp.fundedAmount - wp.releasedAmount - wp.reservedRequestAmount;
    if (p.amount > fundedRemaining) fail("InsufficientVaultBalance");

    let milestoneAddress = PublicKey.default;
    if (p.milestone) {
      if (wp.milestoneCounter === 0n) fail("InvalidStatus");
      const milestone = this.requireMilestone(p.milestone);
      if (!milestone.workPackage.equals(p.workPackage))
        fail("InvalidAccountRelationship");
      if (milestone.status !== "active") fail("InvalidStatus");
      if (milestone.hasActiveRequest) fail("ActiveRequestExists");
      const remainingMilestoneCap = milestone.amount - milestone.releasedAmount;
      if (p.amount > remainingMilestoneCap) fail("InsufficientRemainingCap");
      milestoneAddress = p.milestone;
    } else {
      if (wp.milestoneCounter > 0n) fail("InvalidStatus");
      if (wp.hasActiveRequest) fail("ActiveRequestExists");
      const remainingPackageCap = wp.capAmount - wp.releasedAmount;
      if (p.amount > remainingPackageCap) fail("InsufficientRemainingCap");
    }

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
      hasMilestone: !milestoneAddress.equals(PublicKey.default),
      milestone: milestoneAddress,
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
    wp.reservedRequestAmount += p.amount;
    if (milestoneAddress.equals(PublicKey.default)) {
      wp.hasActiveRequest = true;
      wp.activeRequest = address;
    } else {
      const milestone = this.requireMilestone(milestoneAddress);
      milestone.hasActiveRequest = true;
      milestone.activeRequest = address;
    }
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
    if (wp.highApprovalRequired && pr.status !== "highApproved")
      fail("HighApprovalRequired");
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
    this.releaseReservedRequestAmount(wp, pr.amount);
    if (pr.hasMilestone) {
      const milestone = this.requireMilestone(pr.milestone);
      const remainingMilestoneCap = milestone.amount - milestone.releasedAmount;
      if (pr.amount > remainingMilestoneCap) fail("InsufficientRemainingCap");
      milestone.releasedAmount += pr.amount;
      milestone.hasActiveRequest = false;
      milestone.activeRequest = PublicKey.default;
      if (milestone.releasedAmount === milestone.amount) {
        milestone.status = "completed";
      }
    } else {
      wp.hasActiveRequest = false;
      wp.activeRequest = PublicKey.default;
    }
    if (wp.releasedAmount === wp.capAmount) wp.status = "completed";
    return this.tx();
  }

  async updateHighApprovalPolicy(
    p: UpdateHighApprovalPolicyParams,
  ): Promise<TxResult> {
    const project = this.requireProject(p.project);
    if (!project.authority.equals(p.authority)) fail("Unauthorized");
    const wp = this.requireWorkPackage(p.workPackage);
    if (!wp.project.equals(p.project)) fail("InvalidAccountRelationship");
    if (wp.status !== "draft" && wp.status !== "active") fail("InvalidStatus");
    if (wp.highApprovalRequired === p.highApprovalRequired)
      fail("RoleAlreadyInRequestedState");
    if (wp.reservedRequestAmount > 0n) fail("ActiveRequestExists");

    wp.highApprovalRequired = p.highApprovalRequired;
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
        this.releaseReservedRequestAmount(wp, pr.amount);
        if (pr.hasMilestone) {
          const milestone = this.milestones.get(pr.milestone.toBase58());
          if (milestone) {
            milestone.hasActiveRequest = false;
            milestone.activeRequest = PublicKey.default;
          }
        } else {
          wp.hasActiveRequest = false;
          wp.activeRequest = PublicKey.default;
        }
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

  private requireMilestone(address: PublicKey): MilestoneAccount {
    const v = this.milestones.get(address.toBase58());
    if (!v) fail("InvalidAccountRelationship");
    return v!;
  }

  private requirePaymentRequest(address: PublicKey): PaymentRequestAccount {
    const v = this.paymentRequests.get(address.toBase58());
    if (!v) fail("InvalidAccountRelationship");
    return v!;
  }

  private releaseReservedRequestAmount(
    wp: WorkPackageAccount,
    amount: bigint,
  ): void {
    if (amount > wp.reservedRequestAmount) fail("ArithmeticOverflow");
    wp.reservedRequestAmount -= amount;
  }

  private isTerminal(pr: PaymentRequestAccount): boolean {
    return pr.status === "rejected" || pr.status === "released";
  }

  private tx(): TxResult {
    this.sigCounter += 1;
    return { signature: `mock-sig-${this.sigCounter}` };
  }
}
