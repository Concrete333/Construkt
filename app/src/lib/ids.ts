import type { PublicKey } from "@solana/web3.js";
import type {
  Fetched,
  PaymentRequestAccount,
  ProjectAccount,
  WorkPackageAccount,
} from "./program";

export const nextProjectId = (
  projects: Iterable<Fetched<ProjectAccount>>,
): bigint => {
  let max = 0n;
  for (const project of projects) {
    if (project.account.projectId > max) max = project.account.projectId;
  }
  return max + 1n;
};

export const nextWorkPackageId = (
  packages: Iterable<Fetched<WorkPackageAccount>>,
): bigint => {
  let max = 0n;
  for (const pkg of packages) {
    if (pkg.account.packageId > max) max = pkg.account.packageId;
  }
  return max + 1n;
};

export const nextPaymentRequestId = (
  workPackage: Pick<WorkPackageAccount, "requestCounter">,
  requests: Iterable<Fetched<PaymentRequestAccount>> = [],
): bigint => {
  let max = workPackage.requestCounter;
  for (const request of requests) {
    if (request.account.requestId > max) max = request.account.requestId;
  }
  return max + 1n;
};

export const projectMetadataRef = (
  authority: PublicKey,
  projectId: bigint,
): string => `metadata://demo/project/${authority.toBase58()}/${projectId}`;

export const packageScopeMetadataRef = (
  project: PublicKey,
  packageId: bigint,
): string => `metadata://demo/package-scope/${project.toBase58()}/${packageId}`;

export const documentMetadataRef = (
  workPackage: PublicKey,
  requestId: bigint,
  version: bigint | number = 1,
): string =>
  `metadata://demo/document/${workPackage.toBase58()}/${requestId}/v${version}`;

const timestampKey = (value: string): string =>
  value.replace(/[^0-9A-Za-z]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Approval records are immutable per (request, role) on chain, but the
 * timestamp suffix keeps refs unique if future backends ever allow more
 * than one same-kind note to be attached to the same request.
 */
export const noteMetadataRef = (
  paymentRequest: PublicKey,
  actor: string,
  kind: "approve" | "reject",
  authoredAt: string,
): string =>
  `metadata://demo/note/${paymentRequest.toBase58()}/${actor}/${kind}/${timestampKey(authoredAt)}`;

export const holdMetadataRef = (
  paymentRequest: PublicKey,
  authoredAt: string,
): string =>
  `metadata://demo/hold/${paymentRequest.toBase58()}/${timestampKey(authoredAt)}`;

export const nextDocumentVersion = (
  currentRef: string | null | undefined,
  currentVersion?: number | null,
): number => {
  if (typeof currentVersion === "number" && Number.isFinite(currentVersion)) {
    return currentVersion + 1;
  }
  const match = currentRef?.match(/\/v(\d+)$/);
  if (!match) return currentRef ? 2 : 1;
  return Number.parseInt(match[1], 10) + 1;
};
