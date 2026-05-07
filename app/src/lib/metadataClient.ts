/**
 * Off-chain metadata adapter. The on-chain program only carries opaque
 * reference strings (`metadata_ref`, `scope_ref`, `document_ref`,
 * `note_ref`, `hold_ref`). This boundary turns those refs into the rich
 * display shapes the UI needs (client names, contractor org, document
 * versions, hold reasons) without ever leaking an off-chain dependency
 * into the on-chain client or the selector layer.
 *
 * V0 ships with `MockMetadataClient` (in-memory). Phase 4+ can swap in a
 * Supabase / IPFS / S3-backed implementation by satisfying this same
 * interface. Selectors and components must always go through the
 * interface — never reach into a concrete implementation.
 */

export type ProjectContractModel =
  | "milestone"
  | "valuation"
  | "bespoke"
  | "referenceOnly";

export type PackageContractModel = "milestone" | "valuation" | "bespoke";

export type TeamRole =
  | "financeDirector"
  | "projectManager"
  | "contractor"
  | "director"
  | "other";

const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  financeDirector: "Finance Director",
  projectManager: "Project Manager",
  contractor: "Contractor",
  director: "Director",
  other: "Other",
};

export const teamRoleLabel = (role: TeamRole): string => TEAM_ROLE_LABELS[role];

export type DocumentType =
  | "invoice"
  | "vestingCertificate"
  | "practicalCompletionCertificate"
  | "sitePhoto"
  | "progressReport"
  | "variation"
  | "other";

export type PackageMilestoneStatus = "paid" | "invoiced" | "uninvoiced";

export interface TeamMember {
  /** base58 wallet address; matches the on-chain RoleAssignment.wallet. */
  wallet: string;
  displayName: string;
  org: string;
  role: TeamRole;
}

export interface ProjectMetadata {
  client: string;
  contractModel: ProjectContractModel;
  startDate?: string;
  endDate?: string;
  description?: string;
  team: TeamMember[];
}

export interface PackageMilestone {
  id: string;
  name: string;
  targetDate?: string;
  /** Base units of the package mint. UI formats via `formatMockUsdc`. */
  amount: bigint;
  status: PackageMilestoneStatus;
}

export interface PackageScopeMetadata {
  description: string;
  contractorDisplayName: string;
  contractorOrg?: string;
  contractModel: PackageContractModel;
  startDate?: string;
  endDate?: string;
  internalMilestones?: PackageMilestone[];
}

export interface DocumentMetadata {
  filename: string;
  version: number;
  uploaderDisplayName: string;
  uploaderRole: TeamRole;
  uploadedAt: string;
  documentType: DocumentType;
  linkedPackageMilestoneId?: string;
  url?: string;
}

export interface NoteMetadata {
  text: string;
  authorDisplayName: string;
  authorRole: TeamRole;
  authoredAt: string;
}

export interface HoldMetadata {
  reason: string;
  authorDisplayName: string;
  authorRole: TeamRole;
  authoredAt: string;
}

/**
 * Read-side surface used by selectors and components. Every method is
 * async (so a network-backed implementation drops in cleanly) and
 * returns `null` for unknown refs (so UI can render a fallback rather
 * than throw).
 */
export interface MetadataClient {
  resolveProject(ref: string): Promise<ProjectMetadata | null>;
  resolvePackageScope(ref: string): Promise<PackageScopeMetadata | null>;
  resolveDocument(ref: string): Promise<DocumentMetadata | null>;
  resolveNote(ref: string): Promise<NoteMetadata | null>;
  resolveHold(ref: string): Promise<HoldMetadata | null>;
}

/**
 * Write-side surface used only by the demo seed. A real backend will
 * have its own write path (Supabase mutations, IPFS pin, etc.) that the
 * UI doesn't share, so this stays separate from `MetadataClient`.
 */
export interface MetadataWriter {
  putProject(ref: string, data: ProjectMetadata): void;
  putPackageScope(ref: string, data: PackageScopeMetadata): void;
  putDocument(ref: string, data: DocumentMetadata): void;
  putNote(ref: string, data: NoteMetadata): void;
  putHold(ref: string, data: HoldMetadata): void;
}

const cloneOrNull = <T>(value: T | undefined): T | null =>
  value === undefined ? null : structuredClone(value);

/**
 * In-memory `MetadataClient + MetadataWriter`. Suitable for V0 demo and
 * tests. Returned values are deep-cloned so callers can't mutate the
 * stored payload by accident.
 */
export class MockMetadataClient implements MetadataClient, MetadataWriter {
  private readonly projects = new Map<string, ProjectMetadata>();
  private readonly packages = new Map<string, PackageScopeMetadata>();
  private readonly documents = new Map<string, DocumentMetadata>();
  private readonly notes = new Map<string, NoteMetadata>();
  private readonly holds = new Map<string, HoldMetadata>();

  async resolveProject(ref: string): Promise<ProjectMetadata | null> {
    return cloneOrNull(this.projects.get(ref));
  }
  async resolvePackageScope(ref: string): Promise<PackageScopeMetadata | null> {
    return cloneOrNull(this.packages.get(ref));
  }
  async resolveDocument(ref: string): Promise<DocumentMetadata | null> {
    return cloneOrNull(this.documents.get(ref));
  }
  async resolveNote(ref: string): Promise<NoteMetadata | null> {
    return cloneOrNull(this.notes.get(ref));
  }
  async resolveHold(ref: string): Promise<HoldMetadata | null> {
    return cloneOrNull(this.holds.get(ref));
  }

  putProject(ref: string, data: ProjectMetadata): void {
    this.projects.set(ref, structuredClone(data));
  }
  putPackageScope(ref: string, data: PackageScopeMetadata): void {
    this.packages.set(ref, structuredClone(data));
  }
  putDocument(ref: string, data: DocumentMetadata): void {
    this.documents.set(ref, structuredClone(data));
  }
  putNote(ref: string, data: NoteMetadata): void {
    this.notes.set(ref, structuredClone(data));
  }
  putHold(ref: string, data: HoldMetadata): void {
    this.holds.set(ref, structuredClone(data));
  }
}
