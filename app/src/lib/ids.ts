import type { PublicKey } from "@solana/web3.js";
import type {
  Fetched,
  PaymentRequestAccount,
  ProjectAccount,
  WorkPackageAccount,
} from "./program";

const nextAfterMax = (ids: Iterable<bigint>): bigint => {
  let max = 0n;
  for (const id of ids) {
    if (id > max) max = id;
  }
  return max + 1n;
};

export const nextProjectId = (
  projects: Iterable<Fetched<ProjectAccount>>,
): bigint =>
  nextAfterMax([...projects].map((project) => project.account.projectId));

export const nextWorkPackageId = (
  packages: Iterable<Fetched<WorkPackageAccount>>,
): bigint => nextAfterMax([...packages].map((pkg) => pkg.account.packageId));

export const nextPaymentRequestId = (
  workPackage: Pick<WorkPackageAccount, "requestCounter">,
  requests: Iterable<Fetched<PaymentRequestAccount>> = [],
): bigint => {
  const maxExisting = nextAfterMax([
    workPackage.requestCounter,
    ...[...requests].map((request) => request.account.requestId),
  ]);
  return maxExisting;
};

export const projectMetadataRef = (projectId: bigint): string =>
  `metadata://demo/project/${projectId}`;

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

export const noteMetadataRef = (
  paymentRequest: PublicKey,
  actor: string,
  kind: "approve" | "reject",
): string =>
  `metadata://demo/note/${paymentRequest.toBase58()}/${actor}/${kind}`;

export const holdMetadataRef = (paymentRequest: PublicKey): string =>
  `metadata://demo/hold/${paymentRequest.toBase58()}`;
