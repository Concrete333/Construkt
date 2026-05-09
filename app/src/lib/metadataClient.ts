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

export type DocumentRequestStatus = "requested" | "fulfilled";

export interface DocumentRequestMetadata {
  workPackage: string;
  paymentRequest?: string;
  milestone?: string;
  status: DocumentRequestStatus;
  requestedByDisplayName: string;
  requestedByRole: TeamRole;
  requestedAt: string;
  note: string;
  fulfilledDocumentRef?: string;
  fulfilledAt?: string;
  reviewerNote?: string;
}

export interface WithdrawalClearanceMetadata {
  workPackage: string;
  paymentRequest: string;
  amount: bigint;
  clearedByDisplayName: string;
  clearedByRole: TeamRole;
  clearedAt: string;
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
  resolveDocumentRequest(ref: string): Promise<DocumentRequestMetadata | null>;
  listDocumentRequestsForPackage(
    workPackage: string,
  ): Promise<Array<[string, DocumentRequestMetadata]>>;
  resolveWithdrawalClearance(
    ref: string,
  ): Promise<WithdrawalClearanceMetadata | null>;
  listWithdrawalClearancesForPackage(
    workPackage: string,
  ): Promise<Array<[string, WithdrawalClearanceMetadata]>>;
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
  putDocumentRequest(ref: string, data: DocumentRequestMetadata): void;
  putWithdrawalClearance(ref: string, data: WithdrawalClearanceMetadata): void;
}

export interface MetadataSnapshot {
  projects: Record<string, ProjectMetadata>;
  packages: Record<string, PackageScopeMetadata>;
  documents: Record<string, DocumentMetadata>;
  notes: Record<string, NoteMetadata>;
  holds: Record<string, HoldMetadata>;
  documentRequests: Record<string, DocumentRequestMetadata>;
  withdrawalClearances: Record<string, WithdrawalClearanceMetadata>;
}

export interface MetadataSnapshotStore {
  toSnapshot(): MetadataSnapshot;
  loadSnapshot(snapshot: Partial<MetadataSnapshot>): void;
}

export interface MetadataStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_METADATA_STORAGE_KEY = "construkt.demo.metadata.v1";

const cloneOrNull = <T>(value: T | undefined): T | null =>
  value === undefined ? null : structuredClone(value);

const emptySnapshot = (): MetadataSnapshot => ({
  projects: {},
  packages: {},
  documents: {},
  notes: {},
  holds: {},
  documentRequests: {},
  withdrawalClearances: {},
});

const BIGINT_MARKER = "__construktBigInt";

const stringifySnapshot = (snapshot: MetadataSnapshot): string =>
  JSON.stringify(snapshot, (_key, value: unknown) =>
    typeof value === "bigint" ? { [BIGINT_MARKER]: value.toString() } : value,
  );

const parseSnapshot = (raw: string): MetadataSnapshot =>
  JSON.parse(raw, (_key, value: unknown) => {
    if (
      value &&
      typeof value === "object" &&
      BIGINT_MARKER in value &&
      typeof value[BIGINT_MARKER as keyof typeof value] === "string"
    ) {
      try {
        return BigInt(value[BIGINT_MARKER as keyof typeof value] as string);
      } catch {
        return value;
      }
    }
    return value;
  }) as MetadataSnapshot;

/**
 * In-memory `MetadataClient + MetadataWriter`. Suitable for V0 demo and
 * tests. Returned values are deep-cloned so callers can't mutate the
 * stored payload by accident.
 */
export class MockMetadataClient
  implements MetadataClient, MetadataWriter, MetadataSnapshotStore
{
  private readonly projects = new Map<string, ProjectMetadata>();
  private readonly packages = new Map<string, PackageScopeMetadata>();
  private readonly documents = new Map<string, DocumentMetadata>();
  private readonly notes = new Map<string, NoteMetadata>();
  private readonly holds = new Map<string, HoldMetadata>();
  private readonly documentRequests = new Map<
    string,
    DocumentRequestMetadata
  >();
  private readonly withdrawalClearances = new Map<
    string,
    WithdrawalClearanceMetadata
  >();

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
  async resolveDocumentRequest(
    ref: string,
  ): Promise<DocumentRequestMetadata | null> {
    return cloneOrNull(this.documentRequests.get(ref));
  }
  async listDocumentRequestsForPackage(
    workPackage: string,
  ): Promise<Array<[string, DocumentRequestMetadata]>> {
    return [...this.documentRequests]
      .filter(([, data]) => data.workPackage === workPackage)
      .map(([ref, data]) => [ref, structuredClone(data)]);
  }
  async resolveWithdrawalClearance(
    ref: string,
  ): Promise<WithdrawalClearanceMetadata | null> {
    return cloneOrNull(this.withdrawalClearances.get(ref));
  }
  async listWithdrawalClearancesForPackage(
    workPackage: string,
  ): Promise<Array<[string, WithdrawalClearanceMetadata]>> {
    return [...this.withdrawalClearances]
      .filter(([, data]) => data.workPackage === workPackage)
      .map(([ref, data]) => [ref, structuredClone(data)]);
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
  putDocumentRequest(ref: string, data: DocumentRequestMetadata): void {
    this.documentRequests.set(ref, structuredClone(data));
  }
  putWithdrawalClearance(ref: string, data: WithdrawalClearanceMetadata): void {
    this.withdrawalClearances.set(ref, structuredClone(data));
  }

  loadSnapshot(snapshot: Partial<MetadataSnapshot>): void {
    this.projects.clear();
    this.packages.clear();
    this.documents.clear();
    this.notes.clear();
    this.holds.clear();
    this.documentRequests.clear();
    this.withdrawalClearances.clear();

    for (const [ref, data] of Object.entries(snapshot.projects ?? {})) {
      this.putProject(ref, data);
    }
    for (const [ref, data] of Object.entries(snapshot.packages ?? {})) {
      this.putPackageScope(ref, data);
    }
    for (const [ref, data] of Object.entries(snapshot.documents ?? {})) {
      this.putDocument(ref, data);
    }
    for (const [ref, data] of Object.entries(snapshot.notes ?? {})) {
      this.putNote(ref, data);
    }
    for (const [ref, data] of Object.entries(snapshot.holds ?? {})) {
      this.putHold(ref, data);
    }
    for (const [ref, data] of Object.entries(snapshot.documentRequests ?? {})) {
      this.putDocumentRequest(ref, data);
    }
    for (const [ref, data] of Object.entries(
      snapshot.withdrawalClearances ?? {},
    )) {
      this.putWithdrawalClearance(ref, data);
    }
  }

  toSnapshot(): MetadataSnapshot {
    return {
      projects: Object.fromEntries(
        [...this.projects].map(([ref, data]) => [ref, structuredClone(data)]),
      ),
      packages: Object.fromEntries(
        [...this.packages].map(([ref, data]) => [ref, structuredClone(data)]),
      ),
      documents: Object.fromEntries(
        [...this.documents].map(([ref, data]) => [ref, structuredClone(data)]),
      ),
      notes: Object.fromEntries(
        [...this.notes].map(([ref, data]) => [ref, structuredClone(data)]),
      ),
      holds: Object.fromEntries(
        [...this.holds].map(([ref, data]) => [ref, structuredClone(data)]),
      ),
      documentRequests: Object.fromEntries(
        [...this.documentRequests].map(([ref, data]) => [
          ref,
          structuredClone(data),
        ]),
      ),
      withdrawalClearances: Object.fromEntries(
        [...this.withdrawalClearances].map(([ref, data]) => [
          ref,
          structuredClone(data),
        ]),
      ),
    };
  }
}

/**
 * Browser/local-demo metadata adapter. It keeps the same in-memory behavior
 * as `MockMetadataClient`, but mirrors every write into a simple storage
 * backend so Anchor-mode refs survive page refreshes during local demos.
 */
export class LocalStorageMetadataClient
  implements MetadataClient, MetadataWriter, MetadataSnapshotStore
{
  private readonly client = new MockMetadataClient();
  private readonly storage: MetadataStorage;
  private readonly key: string;
  private warnedPersistFailure = false;

  constructor(storage: MetadataStorage, key = DEFAULT_METADATA_STORAGE_KEY) {
    this.storage = storage;
    this.key = key;
    this.loadStoredSnapshot();
  }

  async resolveProject(ref: string): Promise<ProjectMetadata | null> {
    return this.client.resolveProject(ref);
  }
  async resolvePackageScope(ref: string): Promise<PackageScopeMetadata | null> {
    return this.client.resolvePackageScope(ref);
  }
  async resolveDocument(ref: string): Promise<DocumentMetadata | null> {
    return this.client.resolveDocument(ref);
  }
  async resolveNote(ref: string): Promise<NoteMetadata | null> {
    return this.client.resolveNote(ref);
  }
  async resolveHold(ref: string): Promise<HoldMetadata | null> {
    return this.client.resolveHold(ref);
  }
  async resolveDocumentRequest(
    ref: string,
  ): Promise<DocumentRequestMetadata | null> {
    return this.client.resolveDocumentRequest(ref);
  }
  async listDocumentRequestsForPackage(
    workPackage: string,
  ): Promise<Array<[string, DocumentRequestMetadata]>> {
    return this.client.listDocumentRequestsForPackage(workPackage);
  }
  async resolveWithdrawalClearance(
    ref: string,
  ): Promise<WithdrawalClearanceMetadata | null> {
    return this.client.resolveWithdrawalClearance(ref);
  }
  async listWithdrawalClearancesForPackage(
    workPackage: string,
  ): Promise<Array<[string, WithdrawalClearanceMetadata]>> {
    return this.client.listWithdrawalClearancesForPackage(workPackage);
  }

  putProject(ref: string, data: ProjectMetadata): void {
    this.client.putProject(ref, data);
    this.persist();
  }
  putPackageScope(ref: string, data: PackageScopeMetadata): void {
    this.client.putPackageScope(ref, data);
    this.persist();
  }
  putDocument(ref: string, data: DocumentMetadata): void {
    this.client.putDocument(ref, data);
    this.persist();
  }
  putNote(ref: string, data: NoteMetadata): void {
    this.client.putNote(ref, data);
    this.persist();
  }
  putHold(ref: string, data: HoldMetadata): void {
    this.client.putHold(ref, data);
    this.persist();
  }
  putDocumentRequest(ref: string, data: DocumentRequestMetadata): void {
    this.client.putDocumentRequest(ref, data);
    this.persist();
  }
  putWithdrawalClearance(ref: string, data: WithdrawalClearanceMetadata): void {
    this.client.putWithdrawalClearance(ref, data);
    this.persist();
  }

  toSnapshot(): MetadataSnapshot {
    return this.client.toSnapshot();
  }

  loadSnapshot(snapshot: Partial<MetadataSnapshot>): void {
    this.client.loadSnapshot(snapshot);
    this.persist();
  }

  private loadStoredSnapshot(): void {
    const raw = this.storage.getItem(this.key);
    if (!raw) {
      this.client.loadSnapshot(emptySnapshot());
      return;
    }
    try {
      this.client.loadSnapshot(parseSnapshot(raw));
    } catch {
      this.client.loadSnapshot(emptySnapshot());
    }
  }

  private persist(): void {
    try {
      this.storage.setItem(
        this.key,
        stringifySnapshot(this.client.toSnapshot()),
      );
    } catch (err) {
      // Storage can be unavailable in private mode or locked-down browsers.
      // The in-memory client still carries the current session safely.
      if (!this.warnedPersistFailure) {
        this.warnedPersistFailure = true;
        console.warn(
          "Construkt metadata persistence is unavailable; browser refreshes may discard local demo metadata.",
          err,
        );
      }
    }
  }
}
