import type { MetadataWriter } from "./metadataClient";
import type { DemoPackageSummary, DemoWorld } from "./mockSeed";
import { packageScopeSlug } from "./slug";

/**
 * Maps the on-chain ref strings produced by `seedHospitalFitOut` onto
 * the rich display copy from the prototype's "Demo Hospital Fit-Out"
 * narrative (Northstar Health Trust, Maya Shah / Eleanor Lane / Daniel
 * Okafor). Display data lives entirely in the metadata adapter — the
 * on-chain seed only carries opaque ref strings.
 *
 * This function deliberately re-derives the same ref shapes
 * (`metadata://demo/...`) as `mockSeed.ts` rather than importing them.
 * If those shapes ever drift, the round-trip tests in
 * `metadataSeed.test.ts` will fail loudly.
 */

const DEMO_BASE = "metadata://demo";

export const demoProjectRef = (): string =>
  `${DEMO_BASE}/project/hospital-fit-out`;

export const demoPackageScopeRef = (packageName: string): string =>
  `${DEMO_BASE}/package/${packageScopeSlug(packageName)}`;

export const demoDocumentRef = (packageName: string, version: number): string =>
  `${DEMO_BASE}/document/${packageScopeSlug(packageName)}-invoice-v${version}`;

export const demoNoteRef = (packageName: string, kind: string): string =>
  `${DEMO_BASE}/note/${packageScopeSlug(packageName)}-${kind}`;

export const demoHoldRef = (packageName: string): string =>
  demoNoteRef(packageName, "hold");

export interface MetadataSeedOptions {
  /** Defaults to a fixed demo timestamp so seeded values are stable in tests. */
  now?: () => string;
}

const DEFAULT_NOW = (): string => "2026-04-20T10:00:00Z";

const FINANCE = { displayName: "Maya Shah", org: "Northstar Capital" };
const PM = { displayName: "Eleanor Lane", org: "Construct PM Ltd" };
const CONTRACTOR = {
  displayName: "Daniel Okafor",
  org: "Okafor Builders Ltd",
};
const DIRECTOR = { displayName: "Lin Park", org: "Northstar Capital" };

export const seedDemoMetadata = (
  metadata: MetadataWriter,
  world: DemoWorld,
  opts: MetadataSeedOptions = {},
): void => {
  const now = opts.now ?? DEFAULT_NOW;

  metadata.putProject(demoProjectRef(), {
    client: "Northstar Health Trust",
    contractModel: "referenceOnly",
    startDate: "2026-03-01",
    endDate: "2027-09-01",
    description: "Pediatric wing fit-out across two floors.",
    team: [
      {
        wallet: world.finance.publicKey.toBase58(),
        displayName: FINANCE.displayName,
        org: FINANCE.org,
        role: "financeDirector",
      },
      {
        wallet: world.pm.publicKey.toBase58(),
        displayName: PM.displayName,
        org: PM.org,
        role: "projectManager",
      },
      {
        wallet: world.director.publicKey.toBase58(),
        displayName: DIRECTOR.displayName,
        org: DIRECTOR.org,
        role: "director",
      },
      {
        wallet: world.contractor.publicKey.toBase58(),
        displayName: CONTRACTOR.displayName,
        org: CONTRACTOR.org,
        role: "contractor",
      },
    ],
  });

  const packageEntries: Array<{
    summary: DemoPackageSummary;
    description: string;
    contractModel: "milestone" | "valuation" | "bespoke";
    internalMilestones?: Array<{
      id: string;
      name: string;
      targetDate: string;
      amount: bigint;
      status: "paid" | "invoiced" | "uninvoiced";
    }>;
  }> = [
    {
      summary: world.packages.foundation,
      description: "Foundation pour, bay A only. Released to contractor.",
      contractModel: "milestone",
    },
    {
      summary: world.packages.steelFrame,
      description: "Section B steel frame; awaiting Finance release.",
      contractModel: "milestone",
    },
    {
      summary: world.packages.mepFirstFix,
      description: "Mechanical & electrical first fix across both floors.",
      contractModel: "valuation",
    },
    {
      summary: world.packages.facade,
      description:
        "Facade remediation — currently held pending structural sign-off.",
      contractModel: "milestone",
    },
    {
      summary: world.packages.interior,
      description:
        "Interior fit-out, finishes, and FF&E install. Funded; no request yet.",
      contractModel: "milestone",
      internalMilestones: [
        {
          id: "1",
          name: "Partitions and backing walls",
          targetDate: "2026-05-08",
          amount: 50_000_000n,
          status: "uninvoiced",
        },
        {
          id: "2",
          name: "Flooring and ceilings",
          targetDate: "2026-06-09",
          amount: 50_000_000n,
          status: "uninvoiced",
        },
        {
          id: "3",
          name: "Joinery and finishes",
          targetDate: "2026-07-10",
          amount: 50_000_000n,
          status: "uninvoiced",
        },
        {
          id: "4",
          name: "Final clean and handover",
          targetDate: "2026-08-10",
          amount: 50_000_000n,
          status: "uninvoiced",
        },
      ],
    },
    {
      summary: world.packages.rejectedDelta,
      description:
        "Site logistics variation; PM rejected the first invoice for re-pricing.",
      contractModel: "milestone",
    },
  ];

  for (const entry of packageEntries) {
    metadata.putPackageScope(demoPackageScopeRef(entry.summary.name), {
      description: entry.description,
      contractorDisplayName: CONTRACTOR.displayName,
      contractorOrg: CONTRACTOR.org,
      contractModel: entry.contractModel,
      internalMilestones: entry.internalMilestones,
    });
  }

  for (const entry of packageEntries) {
    if (entry.summary.request === null) continue;
    metadata.putDocument(demoDocumentRef(entry.summary.name, 1), {
      filename: `${packageScopeSlug(entry.summary.name)}-invoice-v1.pdf`,
      version: 1,
      uploaderDisplayName: CONTRACTOR.displayName,
      uploaderRole: "contractor",
      uploadedAt: now(),
      documentType: "invoice",
    });
  }

  metadata.putNote(demoNoteRef(world.packages.foundation.name, "pm-approve"), {
    text: "Foundation pour matches site report; approving for release review.",
    authorDisplayName: PM.displayName,
    authorRole: "projectManager",
    authoredAt: now(),
  });
  metadata.putNote(
    demoNoteRef(world.packages.foundation.name, "director-approve"),
    {
      text: "Optional high approval recorded; cleared for Finance release.",
      authorDisplayName: DIRECTOR.displayName,
      authorRole: "director",
      authoredAt: now(),
    },
  );
  metadata.putNote(demoNoteRef(world.packages.steelFrame.name, "pm-approve"), {
    text: "Steel frame complete per site walk; PM approval recorded.",
    authorDisplayName: PM.displayName,
    authorRole: "projectManager",
    authoredAt: now(),
  });
  metadata.putNote(
    demoNoteRef(world.packages.steelFrame.name, "director-approve"),
    {
      text: "Optional high approval recorded; ready for Finance release.",
      authorDisplayName: DIRECTOR.displayName,
      authorRole: "director",
      authoredAt: now(),
    },
  );
  metadata.putNote(demoNoteRef(world.packages.mepFirstFix.name, "pm-approve"), {
    text: "First-fix valuation accepted to PM-approved stage.",
    authorDisplayName: PM.displayName,
    authorRole: "projectManager",
    authoredAt: now(),
  });
  metadata.putNote(
    demoNoteRef(world.packages.rejectedDelta.name, "pm-reject"),
    {
      text: "Re-price the lifting plan against revised crane access window.",
      authorDisplayName: PM.displayName,
      authorRole: "projectManager",
      authoredAt: now(),
    },
  );

  metadata.putHold(demoHoldRef(world.packages.facade.name), {
    reason:
      "Independent structural inspector report not yet uploaded; release on hold.",
    authorDisplayName: FINANCE.displayName,
    authorRole: "financeDirector",
    authoredAt: now(),
  });
};
