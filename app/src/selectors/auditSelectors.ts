import type { PublicKey } from "@solana/web3.js";
import type {
  ApprovalRecord,
  Fetched,
  PaymentRequestAccount,
  ProjectAccount,
  Role,
  RoleAssignmentAccount,
} from "../lib/program";

/**
 * Categories of timeline events the V0 audit log surfaces. The set is a
 * subset of the on-chain `#[event]` types — it deliberately excludes
 * events that can't be reconstructed from current account state alone
 * (multi-funding history, document-ref change history, repeat holds).
 * A later event-log/indexing pass will fill those gaps.
 */
export type AuditEventKind =
  | "projectCreated"
  | "roleAssigned"
  | "requestSubmitted"
  | "requestLowApproved"
  | "requestHighApproved"
  | "requestRejected"
  | "requestReleased"
  | "holdActive";

export interface AuditEvent {
  /** Unix seconds the event occurred at, taken from the relevant account field. */
  at: bigint;
  kind: AuditEventKind;
  label: string;
  projectAddress?: PublicKey;
  workPackageAddress?: PublicKey;
  paymentRequestAddress?: PublicKey;
  /** The wallet that performed the action, if known from account state. */
  actor?: PublicKey;
  /** Role on actions where the role byte distinguishes the event. */
  role?: Role;
  /** Reference string (`note_ref`, `hold_ref`, etc.) for off-chain copy. */
  ref?: string;
  /** Amount in token base units, where relevant (release events). */
  amount?: bigint;
}

const ROLE_LABEL: Record<Role, string> = {
  contractor: "Contractor",
  lowApprover: "PM",
  highApprover: "High approver",
};

export interface AuditTimelineSources {
  project: Fetched<ProjectAccount>;
  roleAssignments: Fetched<RoleAssignmentAccount>[];
  paymentRequests: Fetched<PaymentRequestAccount>[];
  approvals: Fetched<ApprovalRecord>[];
}

/**
 * Build a chronologically-ordered timeline from the current account state.
 * Limitations:
 *   - Funding events are not reconstructable (we only see `funded_amount`).
 *   - Document-ref edits are collapsed (we only see the latest).
 *   - Removed holds leave no trace; only currently-active holds appear,
 *     dated by `payment_request.updatedAt`.
 *   - Work packages have no `createdAt`, so package-creation events are
 *     omitted; the `roleAssigned` events anchor each package's start.
 * These gaps are tracked in `FrontendBackendConvergencePlan.md` and will be
 * filled when the event-log/indexing pass lands.
 */
export const selectAuditTimeline = (
  sources: AuditTimelineSources,
): AuditEvent[] => {
  const events: AuditEvent[] = [];
  const projectAddr = sources.project.address;

  events.push({
    at: sources.project.account.createdAt,
    kind: "projectCreated",
    label: `Project "${sources.project.account.name}" created`,
    projectAddress: projectAddr,
    actor: sources.project.account.authority,
    ref: sources.project.account.metadataRef,
  });

  for (const ra of sources.roleAssignments) {
    events.push({
      at: ra.account.assignedAt,
      kind: "roleAssigned",
      label: `${ROLE_LABEL[ra.account.role]} assigned`,
      projectAddress: projectAddr,
      workPackageAddress: ra.account.workPackage,
      actor: ra.account.assignedBy,
      role: ra.account.role,
    });
  }

  // Index approvals by request → role for quick lookup of decision metadata.
  const approvalsByRequest = new Map<
    string,
    { lowApprover?: ApprovalRecord; highApprover?: ApprovalRecord }
  >();
  for (const ar of sources.approvals) {
    const key = ar.account.paymentRequest.toBase58();
    const slot = approvalsByRequest.get(key) ?? {};
    if (ar.account.role === "lowApprover") slot.lowApprover = ar.account;
    else if (ar.account.role === "highApprover") slot.highApprover = ar.account;
    approvalsByRequest.set(key, slot);
  }

  for (const pr of sources.paymentRequests) {
    const requestAddr = pr.address;
    const wpAddr = pr.account.workPackage;
    events.push({
      at: pr.account.submittedAt,
      kind: "requestSubmitted",
      label: "Payment request submitted",
      projectAddress: projectAddr,
      workPackageAddress: wpAddr,
      paymentRequestAddress: requestAddr,
      actor: pr.account.contractor,
      amount: pr.account.amount,
      ref: pr.account.documentRef,
    });

    const slot = approvalsByRequest.get(requestAddr.toBase58()) ?? {};
    const low = slot.lowApprover;
    if (low) {
      events.push({
        at: low.createdAt,
        kind:
          low.decision === "rejected"
            ? "requestRejected"
            : "requestLowApproved",
        label:
          low.decision === "rejected"
            ? "Request rejected by PM"
            : "PM approved the request",
        projectAddress: projectAddr,
        workPackageAddress: wpAddr,
        paymentRequestAddress: requestAddr,
        actor: low.approver,
        role: "lowApprover",
        ref: low.noteRef.length > 0 ? low.noteRef : undefined,
      });
    }
    const high = slot.highApprover;
    if (high) {
      events.push({
        at: high.createdAt,
        kind:
          high.decision === "rejected"
            ? "requestRejected"
            : "requestHighApproved",
        label:
          high.decision === "rejected"
            ? "Request rejected by high approver"
            : "High approver cleared the request",
        projectAddress: projectAddr,
        workPackageAddress: wpAddr,
        paymentRequestAddress: requestAddr,
        actor: high.approver,
        role: "highApprover",
        ref: high.noteRef.length > 0 ? high.noteRef : undefined,
      });
    }

    if (pr.account.status === "released") {
      events.push({
        at: pr.account.updatedAt,
        kind: "requestReleased",
        label: "Payment released by Finance",
        projectAddress: projectAddr,
        workPackageAddress: wpAddr,
        paymentRequestAddress: requestAddr,
        amount: pr.account.releasedAmount,
      });
    }

    if (pr.account.holdActive) {
      events.push({
        at: pr.account.updatedAt,
        kind: "holdActive",
        label: "Hold placed by Finance",
        projectAddress: projectAddr,
        workPackageAddress: wpAddr,
        paymentRequestAddress: requestAddr,
        actor: pr.account.holdBy,
        ref: pr.account.holdRef.length > 0 ? pr.account.holdRef : undefined,
      });
    }
  }

  return events.sort((a, b) => {
    if (a.at < b.at) return -1;
    if (a.at > b.at) return 1;
    return 0;
  });
};
