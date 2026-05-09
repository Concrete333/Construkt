import { Keypair, PublicKey } from "@solana/web3.js";
import {
  deriveMilestoneAddress,
  derivePaymentRequestAddress,
  deriveProjectAddress,
  deriveWorkPackageAddress,
} from "./pda";
import type { ConstruktClient } from "./program";
import { packageScopeSlug } from "./slug";

/**
 * Deterministic keypair generator for demo data. The fill byte makes each
 * keypair recognizable in test output (e.g. seed 1 = the finance wallet).
 * These are demo-only wallets; never use this pattern for production keys.
 */
const demoKeypair = (fillByte: number): Keypair =>
  Keypair.fromSeed(new Uint8Array(32).fill(fillByte));

const SEED_BYTES = {
  finance: 1,
  pm: 2,
  director: 3,
  contractor: 4,
  mint: 10,
} as const;

const PROJECT_ID = 1n;
const PROJECT_BUDGET = 1_400_000_000n;

/**
 * Mock USDC has 6 decimals, so 200_000_000 base units = $200.00. Cap and
 * funding amounts in this seed are sized so the demo flow doesn't bump
 * into `InsufficientRemainingCap` accidentally.
 */
const PACKAGE_CAP = 200_000_000n;

/**
 * Names mirror the prototype's "Demo Hospital Fit-Out" narrative so the
 * integrated UI demo lands on familiar copy. Display-rich fields like
 * client name and project manager name belong in the off-chain metadata
 * adapter (Phase 3 / Step 12); on-chain we only carry an opaque ref.
 */
const PROJECT_METADATA_REF = "metadata://demo/project/hospital-fit-out";

const scopeRefFor = (packageName: string): string =>
  `metadata://demo/package/${packageScopeSlug(packageName)}`;

const documentRefFor = (packageName: string, version: number): string =>
  `metadata://demo/document/${packageScopeSlug(
    packageName,
  )}-invoice-v${version}`;

const noteRefFor = (packageName: string, kind: string): string =>
  `metadata://demo/note/${packageScopeSlug(packageName)}-${kind}`;

const milestoneRefFor = (packageName: string, milestoneId: bigint): string =>
  `metadata://demo/milestone/${packageScopeSlug(packageName)}-${milestoneId}`;

export interface DemoPackageSummary {
  name: string;
  /** Address of the WorkPackage PDA. */
  address: PublicKey;
  /**
   * Address of the active or most-recent PaymentRequest PDA, if any.
   * `null` for packages that have no request yet.
   */
  request: PublicKey | null;
  milestones?: PublicKey[];
  /** Final on-chain status of the request, if a request was created. */
  finalStatus:
    | "noRequest"
    | "submittedOnHold"
    | "lowApproved"
    | "highApproved"
    | "released"
    | "rejected";
}

export interface DemoWorld {
  finance: Keypair;
  pm: Keypair;
  director: Keypair;
  contractor: Keypair;
  mint: PublicKey;
  project: PublicKey;
  packages: {
    foundation: DemoPackageSummary;
    steelFrame: DemoPackageSummary;
    mepFirstFix: DemoPackageSummary;
    facade: DemoPackageSummary;
    interior: DemoPackageSummary;
    rejectedDelta: DemoPackageSummary;
    complianceUpgrade: DemoPackageSummary;
  };
}

export interface SeedOptions {
  programId: PublicKey;
}

/**
 * Drives a `ConstruktClient` through the on-chain instruction set to build
 * a representative "Demo Hospital Fit-Out" world: one project, seven work
 * packages each in a different state, plus all the role assignments and
 * payment requests needed to exercise the V0 dashboard, project list, and
 * work-package surfaces.
 *
 * Status coverage across the seven packages:
 *   - foundation:    released
 *   - steelFrame:    highApproved (optional high approval recorded; waiting on finance)
 *   - mepFirstFix:   lowApproved (PM-approved and ready for finance release)
 *   - facade:        submitted + held (waiting on finance to remove the hold)
 *   - interior:      funded but no request yet
 *   - rejectedDelta: rejected (request was rejected; package is unblocked
 *     for a new request)
 *   - complianceUpgrade: lowApproved with required-high policy (waiting on
 *     Director approval)
 */
export const seedHospitalFitOut = async (
  client: ConstruktClient,
  opts: SeedOptions,
): Promise<DemoWorld> => {
  const finance = demoKeypair(SEED_BYTES.finance);
  const pm = demoKeypair(SEED_BYTES.pm);
  const director = demoKeypair(SEED_BYTES.director);
  const contractor = demoKeypair(SEED_BYTES.contractor);
  const mint = demoKeypair(SEED_BYTES.mint).publicKey;

  await client.initializeProject({
    authority: finance.publicKey,
    projectId: PROJECT_ID,
    mint,
    budgetAmount: PROJECT_BUDGET,
    name: "Demo Hospital Fit-Out",
    metadataRef: PROJECT_METADATA_REF,
  });
  const project = deriveProjectAddress(
    opts.programId,
    finance.publicKey,
    PROJECT_ID,
  );
  await client.assignProjectDrafter({
    authority: finance.publicKey,
    project,
    wallet: pm.publicKey,
  });

  let nextPackageId = 1n;
  const setupPackage = async (
    name: string,
    milestones: Array<{
      amount: bigint;
      startAt: bigint;
      endAt: bigint;
    }> = [],
    options: { highApprovalRequired?: boolean } = {},
  ): Promise<{
    address: PublicKey;
    packageId: bigint;
    milestones: PublicKey[];
  }> => {
    const packageId = nextPackageId++;
    await client.createWorkPackage({
      authority: finance.publicKey,
      project,
      packageId,
      capAmount: PACKAGE_CAP,
      contractor: contractor.publicKey,
      mint,
      scopeRef: scopeRefFor(name),
      highApprovalRequired: options.highApprovalRequired,
    });
    const address = deriveWorkPackageAddress(
      opts.programId,
      project,
      packageId,
    );
    const milestoneAddresses: PublicKey[] = [];
    for (const [idx, milestone] of milestones.entries()) {
      const milestoneId = BigInt(idx + 1);
      await client.createMilestone({
        authority: finance.publicKey,
        project,
        workPackage: address,
        milestoneId,
        amount: milestone.amount,
        startAt: milestone.startAt,
        endAt: milestone.endAt,
        metadataRef: milestoneRefFor(name, milestoneId),
      });
      milestoneAddresses.push(
        deriveMilestoneAddress(opts.programId, address, milestoneId),
      );
    }
    await client.fundEscrow({
      authority: finance.publicKey,
      project,
      workPackage: address,
      amount: PACKAGE_CAP,
    });
    await client.assignRole({
      authority: finance.publicKey,
      project,
      workPackage: address,
      role: "contractor",
      wallet: contractor.publicKey,
    });
    await client.assignRole({
      authority: finance.publicKey,
      project,
      workPackage: address,
      role: "lowApprover",
      wallet: pm.publicKey,
    });
    await client.assignRole({
      authority: finance.publicKey,
      project,
      workPackage: address,
      role: "highApprover",
      wallet: director.publicKey,
    });
    return { address, packageId, milestones: milestoneAddresses };
  };

  const submitRequest = async (
    workPackage: PublicKey,
    name: string,
  ): Promise<PublicKey> => {
    const requestId = 1n;
    await client.submitPaymentRequest({
      contractor: contractor.publicKey,
      project,
      workPackage,
      requestId,
      amount: PACKAGE_CAP,
      documentRef: documentRefFor(name, 1),
    });
    return derivePaymentRequestAddress(opts.programId, workPackage, requestId);
  };

  // Package 1 — released after PM plus optional high approval
  const foundation = await setupPackage("Foundation Pour Bay A");
  const foundationRequest = await submitRequest(
    foundation.address,
    "Foundation Pour Bay A",
  );
  await client.approveRequest({
    approver: pm.publicKey,
    project,
    workPackage: foundation.address,
    paymentRequest: foundationRequest,
    role: "lowApprover",
    noteRef: noteRefFor("Foundation Pour Bay A", "pm-approve"),
  });
  await client.approveRequest({
    approver: director.publicKey,
    project,
    workPackage: foundation.address,
    paymentRequest: foundationRequest,
    role: "highApprover",
    noteRef: noteRefFor("Foundation Pour Bay A", "director-approve"),
  });
  await client.releasePayment({
    authority: finance.publicKey,
    project,
    workPackage: foundation.address,
    paymentRequest: foundationRequest,
    contractorTokenAccount: contractor.publicKey,
  });

  // Package 2 — highApproved via optional high step, waiting on finance release
  const steelFrame = await setupPackage("Steel Frame Section B");
  const steelFrameRequest = await submitRequest(
    steelFrame.address,
    "Steel Frame Section B",
  );
  await client.approveRequest({
    approver: pm.publicKey,
    project,
    workPackage: steelFrame.address,
    paymentRequest: steelFrameRequest,
    role: "lowApprover",
    noteRef: noteRefFor("Steel Frame Section B", "pm-approve"),
  });
  await client.approveRequest({
    approver: director.publicKey,
    project,
    workPackage: steelFrame.address,
    paymentRequest: steelFrameRequest,
    role: "highApprover",
    noteRef: noteRefFor("Steel Frame Section B", "director-approve"),
  });

  // Package 3 — lowApproved, release-ready without optional high approval
  const mepFirstFix = await setupPackage("MEP First Fix");
  const mepFirstFixRequest = await submitRequest(
    mepFirstFix.address,
    "MEP First Fix",
  );
  await client.approveRequest({
    approver: pm.publicKey,
    project,
    workPackage: mepFirstFix.address,
    paymentRequest: mepFirstFixRequest,
    role: "lowApprover",
    noteRef: noteRefFor("MEP First Fix", "pm-approve"),
  });

  // Package 4 — submitted, then placed on hold by finance
  const facade = await setupPackage("Facade Remediation");
  const facadeRequest = await submitRequest(
    facade.address,
    "Facade Remediation",
  );
  await client.placeHold({
    authority: finance.publicKey,
    project,
    workPackage: facade.address,
    paymentRequest: facadeRequest,
    holdRef: noteRefFor("Facade Remediation", "hold"),
  });

  // Package 5 — funded only, no request yet
  const interior = await setupPackage("Interior Fit-Out", [
    { amount: 50_000_000n, startAt: 1_775_779_200n, endAt: 1_778_284_800n },
    { amount: 50_000_000n, startAt: 1_778_371_200n, endAt: 1_780_963_200n },
    { amount: 50_000_000n, startAt: 1_781_049_600n, endAt: 1_783_641_600n },
    { amount: 50_000_000n, startAt: 1_783_728_000n, endAt: 1_786_320_000n },
  ]);

  // Package 6 — request rejected by PM (work package itself unblocked)
  const rejectedDelta = await setupPackage("Site Logistics Variation");
  const rejectedDeltaRequest = await submitRequest(
    rejectedDelta.address,
    "Site Logistics Variation",
  );
  await client.rejectRequest({
    approver: pm.publicKey,
    project,
    workPackage: rejectedDelta.address,
    paymentRequest: rejectedDeltaRequest,
    role: "lowApprover",
    noteRef: noteRefFor("Site Logistics Variation", "pm-reject"),
  });

  // Package 7 — required-high policy: PM has approved, Director approval still
  // pending so release is gated by `high_approval_required`.
  const complianceUpgrade = await setupPackage(
    "Fire & Compliance Upgrade",
    [],
    { highApprovalRequired: true },
  );
  const complianceUpgradeRequest = await submitRequest(
    complianceUpgrade.address,
    "Fire & Compliance Upgrade",
  );
  await client.approveRequest({
    approver: pm.publicKey,
    project,
    workPackage: complianceUpgrade.address,
    paymentRequest: complianceUpgradeRequest,
    role: "lowApprover",
    noteRef: noteRefFor("Fire & Compliance Upgrade", "pm-approve"),
  });

  return {
    finance,
    pm,
    director,
    contractor,
    mint,
    project,
    packages: {
      foundation: {
        name: "Foundation Pour — Bay A",
        address: foundation.address,
        request: foundationRequest,
        finalStatus: "released",
      },
      steelFrame: {
        name: "Steel Frame — Section B",
        address: steelFrame.address,
        request: steelFrameRequest,
        finalStatus: "highApproved",
      },
      mepFirstFix: {
        name: "MEP First Fix",
        address: mepFirstFix.address,
        request: mepFirstFixRequest,
        finalStatus: "lowApproved",
      },
      facade: {
        name: "Facade Remediation",
        address: facade.address,
        request: facadeRequest,
        finalStatus: "submittedOnHold",
      },
      interior: {
        name: "Interior Fit-Out",
        address: interior.address,
        request: null,
        milestones: interior.milestones,
        finalStatus: "noRequest",
      },
      rejectedDelta: {
        name: "Site Logistics Variation",
        address: rejectedDelta.address,
        request: rejectedDeltaRequest,
        finalStatus: "rejected",
      },
      complianceUpgrade: {
        name: "Fire & Compliance Upgrade",
        address: complianceUpgrade.address,
        request: complianceUpgradeRequest,
        finalStatus: "lowApproved",
      },
    },
  };
};
