import type { PublicKey } from "@solana/web3.js";
import type {
  ApprovalRecord,
  Fetched,
  PaymentRequestAccount,
  WorkPackageAccount,
} from "../lib/program";

/**
 * The on-chain `PaymentRequestStatus` plus the `holdActive` flag together
 * give the request seven UI-relevant states. The selector explodes the
 * combination so views can switch on a single value.
 */
export type PaymentRequestDisplayStatus =
  | "submitted"
  | "submittedOnHold"
  | "lowApproved"
  | "lowApprovedOnHold"
  | "highApproved"
  | "highApprovedOnHold"
  | "released"
  | "rejected";

export const paymentRequestDisplayStatus = (
  request: Pick<PaymentRequestAccount, "status" | "holdActive">,
): PaymentRequestDisplayStatus => {
  if (request.status === "released") return "released";
  if (request.status === "rejected") return "rejected";
  if (!request.holdActive) return request.status;
  switch (request.status) {
    case "submitted":
      return "submittedOnHold";
    case "lowApproved":
      return "lowApprovedOnHold";
    case "highApproved":
      return "highApprovedOnHold";
  }
};

const STATUS_LABELS: Record<PaymentRequestDisplayStatus, string> = {
  submitted: "Submitted — pending PM",
  submittedOnHold: "On hold (submitted)",
  lowApproved: "PM approved — pending Finance release",
  lowApprovedOnHold: "On hold (PM approved)",
  highApproved: "High approver cleared — pending Finance release",
  highApprovedOnHold: "On hold (high approver cleared)",
  released: "Released",
  rejected: "Rejected",
};

export const paymentRequestStatusLabel = (
  status: PaymentRequestDisplayStatus,
): string => STATUS_LABELS[status];

export type ApprovalChipTone =
  | "neutral"
  | "warning"
  | "info"
  | "success"
  | "error";

const STATUS_TONES: Record<PaymentRequestDisplayStatus, ApprovalChipTone> = {
  submitted: "info",
  submittedOnHold: "warning",
  lowApproved: "info",
  lowApprovedOnHold: "warning",
  highApproved: "info",
  highApprovedOnHold: "warning",
  released: "success",
  rejected: "error",
};

export const paymentRequestChipTone = (
  status: PaymentRequestDisplayStatus,
): ApprovalChipTone => STATUS_TONES[status];

/** One slot in the approval tracker — either pending, approved, or rejected. */
export interface ApprovalTrackerEntry {
  state: "pending" | "approved" | "rejected";
  approver: PublicKey | null;
  at: bigint | null;
  noteRef: string | null;
}

export interface ApprovalTracker {
  lowApprover: ApprovalTrackerEntry;
  highApprover: ApprovalTrackerEntry;
}

const PENDING_ENTRY: ApprovalTrackerEntry = {
  state: "pending",
  approver: null,
  at: null,
  noteRef: null,
};

export const selectApprovalTracker = (
  approvals: Fetched<ApprovalRecord>[] | ApprovalRecord[],
): ApprovalTracker => {
  const records = approvals.map((a) =>
    "account" in a ? (a.account as ApprovalRecord) : a,
  );
  const findFor = (
    role: "lowApprover" | "highApprover",
  ): ApprovalTrackerEntry => {
    const record = records.find((r) => r.role === role);
    if (!record) return { ...PENDING_ENTRY };
    return {
      state: record.decision === "approved" ? "approved" : "rejected",
      approver: record.approver,
      at: record.createdAt,
      noteRef: record.noteRef.length > 0 ? record.noteRef : null,
    };
  };
  return {
    lowApprover: findFor("lowApprover"),
    highApprover: findFor("highApprover"),
  };
};

/**
 * Mirrors the on-chain release-time guards in `release_payment`. If
 * `reasons` is empty the request is releasable; otherwise the UI should
 * show the listed blockers and either prompt finance or wait.
 */
export type ReleaseBlockedReason =
  | "AlreadyReleased"
  | "NotApprovedForRelease"
  | "RequestRejected"
  | "PackageNotActive"
  | "OnHold"
  | "InsufficientRemainingCap"
  | "InsufficientFundedRemaining";

export interface ReleaseReadiness {
  ready: boolean;
  reasons: ReleaseBlockedReason[];
}

export const selectReleaseReadiness = (
  request: PaymentRequestAccount,
  workPackage: WorkPackageAccount,
): ReleaseReadiness => {
  const reasons: ReleaseBlockedReason[] = [];

  if (request.status === "released") {
    reasons.push("AlreadyReleased");
  } else if (request.status === "rejected") {
    reasons.push("RequestRejected");
  } else if (
    request.status !== "lowApproved" &&
    request.status !== "highApproved"
  ) {
    reasons.push("NotApprovedForRelease");
  }
  if (workPackage.status !== "active") reasons.push("PackageNotActive");
  if (request.holdActive) reasons.push("OnHold");

  const remainingCap = workPackage.capAmount - workPackage.releasedAmount;
  if (request.amount > remainingCap) reasons.push("InsufficientRemainingCap");
  const fundedRemaining = workPackage.fundedAmount - workPackage.releasedAmount;
  if (request.amount > fundedRemaining)
    reasons.push("InsufficientFundedRemaining");

  return { ready: reasons.length === 0, reasons };
};

export const releaseBlockedReasonLabel = (
  reason: ReleaseBlockedReason,
): string => {
  switch (reason) {
    case "AlreadyReleased":
      return "This request has already been released.";
    case "NotApprovedForRelease":
      return "PM approval is required before release.";
    case "RequestRejected":
      return "This request was rejected and cannot be released.";
    case "PackageNotActive":
      return "Work package is no longer active.";
    case "OnHold":
      return "Request is currently on hold.";
    case "InsufficientRemainingCap":
      return "Release amount exceeds the package cap.";
    case "InsufficientFundedRemaining":
      return "Escrow does not hold enough funded balance.";
  }
};

/**
 * Compact, components-friendly summary of a request — most surfaces will
 * pull this once and read fields off it instead of re-deriving labels.
 */
export interface PaymentRequestSummary {
  request: PaymentRequestAccount;
  displayStatus: PaymentRequestDisplayStatus;
  statusLabel: string;
  chipTone: ApprovalChipTone;
  approvals: ApprovalTracker;
  releaseReadiness: ReleaseReadiness;
  isTerminal: boolean;
}

export const selectPaymentRequestSummary = (
  request: PaymentRequestAccount,
  workPackage: WorkPackageAccount,
  approvals: Fetched<ApprovalRecord>[] | ApprovalRecord[],
): PaymentRequestSummary => {
  const displayStatus = paymentRequestDisplayStatus(request);
  return {
    request,
    displayStatus,
    statusLabel: paymentRequestStatusLabel(displayStatus),
    chipTone: paymentRequestChipTone(displayStatus),
    approvals: selectApprovalTracker(approvals),
    releaseReadiness: selectReleaseReadiness(request, workPackage),
    isTerminal: request.status === "released" || request.status === "rejected",
  };
};
