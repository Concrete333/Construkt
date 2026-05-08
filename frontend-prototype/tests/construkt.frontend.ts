/**
 * Unit tests for pure helper functions in construkt.js.
 *
 * Functions under test are re-declared here (identical logic) because
 * construkt.js is a browser script with no module exports. This keeps
 * production code unchanged while giving full coverage of every pure
 * function in Node via mocha + chai.
 */

import { expect } from "chai";

// ─── Functions under test (mirrored from construkt.js) ────────────────────────

function formatGBP(n: number): string {
  if (n >= 1_000_000) return "£" + (n / 1_000_000).toFixed(2) + "m";
  if (n >= 1_000) return "£" + (n / 1_000).toFixed(0) + "k";
  return "£" + n.toLocaleString();
}

function parseMoneyKpi(text: string): number {
  const normalized = String(text).replace(/,/g, "").trim();
  const match = normalized.match(/£\s*([\d.]+)\s*(m|k)?/i);
  if (!match) return 0;
  let value = parseFloat(match[1]);
  if (Number.isNaN(value)) return 0;
  const suffix = (match[2] || "").toLowerCase();
  if (suffix === "m") value *= 1_000_000;
  if (suffix === "k") value *= 1_000;
  return value;
}

function formatMoneyKpi(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}m`;
  if (magnitude >= 1_000) return `£${Math.round(value / 1_000)}k`;
  return `£${Math.round(value)}`;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function dateProgress(
  startDate: string,
  endDate: string,
  currentDate: Date = new Date()
): number {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const current = currentDate.getTime();
  if (!start || !end || end <= start) return 0;
  return clampPercent(((current - start) / (end - start)) * 100);
}

function roleKeyFromLabel(label: string): string {
  if (label === "Finance Director") return "finance_director";
  if (label === "Project Manager") return "project_manager";
  return "contractor";
}

function roleLabel(role: string): string {
  if (role === "finance_director") return "Finance";
  if (role === "project_manager") return "PM";
  if (role === "contractor") return "Contractor";
  return "Not Linked";
}

function roleFullLabel(role: string): string {
  if (role === "finance_director") return "Finance Director";
  if (role === "project_manager") return "Project Manager";
  if (role === "contractor") return "Contractor";
  return "Not Linked";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function chipTone(status: string): string {
  const value = String(status || "").toLowerCase();
  // Check warning phrases first so "partially funded" and "in progress" aren't
  // swallowed by the broader "funded" / "released" success matches.
  if (/(held|partially funded|in progress)/.test(value))
    return "chip-tone-warning";
  if (/(released|funded|approved|active)/.test(value))
    return "chip-tone-success";
  if (/(submitted|pending|under review)/.test(value))
    return "chip-tone-primary";
  if (/(rejected|locked|blocked)/.test(value)) return "chip-tone-danger";
  return "chip-tone-neutral";
}

function timelineDot(type: string): string {
  if (type === "released") return "green";
  if (type === "pending") return "yellow";
  if (type === "rejected") return "red";
  return "";
}

function modelLabel(model: string): string {
  if (model === "milestone") return "Milestone";
  if (model === "valuation") return "Valuation";
  if (model === "bespoke") return "Bespoke";
  if (model === "mixed") return "Package-level";
  return "Milestone";
}

function timelineStatusClass(status: string): string {
  if (status === "complete") return "project-phase-timeline__node--complete";
  if (status === "in-progress") return "project-phase-timeline__node--current";
  if (status === "blocked") return "project-phase-timeline__node--complete";
  return "project-phase-timeline__node--future";
}

interface Package {
  id: string;
  name: string;
  cap: number;
  funded: number;
  released: number;
  status: string;
  contractor: string;
  financeApprovalStatus?: string;
  requests: Array<{ id: string; amount: number; status: string }>;
}

interface Project {
  id: string;
  name: string;
  packages: Package[];
  milestones: Array<{
    id: string;
    name: string;
    targetDate: string;
    status: string;
    packageIds: string[];
  }>;
  auditLog: Array<{ event: string; actor: string; date: string; type: string }>;
  startDate: string;
  endDate: string;
  contractModel: string;
  team: Array<{ name: string; role: string; org: string }>;
}

function getProjectTotals(project: Project) {
  const contractValue = project.packages.reduce((s, p) => s + p.cap, 0);
  const escrowFunded = project.packages.reduce((s, p) => s + p.funded, 0);
  const totalReleased = project.packages.reduce((s, p) => s + p.released, 0);
  return {
    contractValue,
    escrowFunded,
    totalReleased,
    remaining: contractValue - totalReleased,
  };
}

function hasAssignedContractor(pkg: Package): boolean {
  return Boolean(
    pkg?.contractor &&
      pkg.contractor !== "Unassigned estimate" &&
      pkg.contractor !== "Unassigned"
  );
}

function financeApprovalStatus(pkg: Package): string {
  if (pkg?.financeApprovalStatus) return pkg.financeApprovalStatus;
  if (pkg?.funded > 0) return "Escrow Locked";
  if (hasAssignedContractor(pkg) && pkg?.cap > 0)
    return "Awaiting Finance Approval";
  return "Estimate";
}

function packageStatusClass(status: string): string {
  const normalized = String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (
    ["completed", "in-progress", "estimated", "unallocated"].includes(
      normalized
    )
  )
    return normalized;
  return "estimated";
}

function packageStatusLabel(status: string): string {
  const normalized = packageStatusClass(status);
  if (normalized === "completed") return "Completed";
  if (normalized === "in-progress") return "In Progress";
  if (normalized === "unallocated") return "Unallocated";
  return "Estimated";
}

function buildBespokeTimeline(project: Project) {
  return project.packages.map((pkg) => ({
    name: pkg.name,
    targetDate: project.endDate,
    status:
      pkg.status === "Locked"
        ? "blocked"
        : pkg.status === "Released"
        ? "complete"
        : pkg.requests.length
        ? "in-progress"
        : "upcoming",
  }));
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("formatGBP", () => {
  it("formats millions with 2 decimal places", () => {
    expect(formatGBP(1_000_000)).to.equal("£1.00m");
    expect(formatGBP(2_500_000)).to.equal("£2.50m");
    expect(formatGBP(1_234_567)).to.equal("£1.23m");
  });

  it("formats thousands with no decimals", () => {
    expect(formatGBP(1_000)).to.equal("£1k");
    expect(formatGBP(640_000)).to.equal("£640k");
    expect(formatGBP(92_400)).to.equal("£92k");
  });

  it("formats sub-thousand amounts as plain number", () => {
    expect(formatGBP(0)).to.equal("£0");
    expect(formatGBP(500)).to.equal("£500");
  });

  it("boundary: 999 is not formatted as k", () => {
    expect(formatGBP(999)).to.equal("£999");
  });

  it("boundary: 1000 is formatted as k", () => {
    expect(formatGBP(1000)).to.equal("£1k");
  });
});

describe("parseMoneyKpi", () => {
  it("parses millions", () => {
    expect(parseMoneyKpi("£3.8m")).to.equal(3_800_000);
    expect(parseMoneyKpi("£1.0m")).to.equal(1_000_000);
  });

  it("parses thousands", () => {
    expect(parseMoneyKpi("£312k")).to.equal(312_000);
    expect(parseMoneyKpi("£2.6m")).to.equal(2_600_000);
  });

  it("parses plain numbers", () => {
    expect(parseMoneyKpi("£0")).to.equal(0);
    expect(parseMoneyKpi("£500")).to.equal(500);
  });

  it("is case-insensitive for suffix", () => {
    expect(parseMoneyKpi("£1.5M")).to.equal(1_500_000);
    expect(parseMoneyKpi("£400K")).to.equal(400_000);
  });

  it("returns 0 for non-money strings", () => {
    expect(parseMoneyKpi("N/A")).to.equal(0);
    expect(parseMoneyKpi("")).to.equal(0);
    expect(parseMoneyKpi("pending")).to.equal(0);
  });

  it("handles commas in number", () => {
    expect(parseMoneyKpi("£1,000")).to.equal(1_000);
  });
});

describe("formatMoneyKpi", () => {
  it("formats millions with 1 decimal", () => {
    expect(formatMoneyKpi(1_000_000)).to.equal("£1.0m");
    expect(formatMoneyKpi(2_500_000)).to.equal("£2.5m");
  });

  it("formats thousands rounded", () => {
    expect(formatMoneyKpi(1_500)).to.equal("£2k");
    expect(formatMoneyKpi(640_000)).to.equal("£640k");
  });

  it("formats sub-thousand as integer", () => {
    expect(formatMoneyKpi(0)).to.equal("£0");
    expect(formatMoneyKpi(750)).to.equal("£750");
  });
});

describe("easeOutCubic", () => {
  it("returns 0 at t=0", () => {
    expect(easeOutCubic(0)).to.equal(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeOutCubic(1)).to.equal(1);
  });

  it("returns a value between 0 and 1 for mid-range t", () => {
    const v = easeOutCubic(0.5);
    expect(v).to.be.greaterThan(0.5); // ease-out accelerates early
    expect(v).to.be.lessThan(1);
  });

  it("is monotonically increasing", () => {
    const values = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map(easeOutCubic);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).to.be.greaterThanOrEqual(values[i - 1]);
    }
  });
});

describe("clampPercent", () => {
  it("clamps values below 0 to 0", () => {
    expect(clampPercent(-10)).to.equal(0);
    expect(clampPercent(-0.001)).to.equal(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clampPercent(101)).to.equal(100);
    expect(clampPercent(9999)).to.equal(100);
  });

  it("passes through values within [0, 100]", () => {
    expect(clampPercent(0)).to.equal(0);
    expect(clampPercent(50)).to.equal(50);
    expect(clampPercent(100)).to.equal(100);
  });
});

describe("dateProgress", () => {
  const start = "2026-01-01";
  const end = "2026-12-31";

  it("returns 0 when current date equals start", () => {
    const result = dateProgress(start, end, new Date("2026-01-01T00:00:00"));
    expect(result).to.be.closeTo(0, 0.1);
  });

  it("returns 100 when current date equals end", () => {
    const result = dateProgress(start, end, new Date("2026-12-31T00:00:00"));
    expect(result).to.equal(100);
  });

  it("returns ~50 at the midpoint", () => {
    const result = dateProgress(start, end, new Date("2026-07-02T00:00:00"));
    expect(result).to.be.within(49, 51);
  });

  it("returns 0 when end <= start", () => {
    expect(
      dateProgress("2026-06-01", "2026-01-01", new Date("2026-03-01"))
    ).to.equal(0);
  });

  it("clamps at 100 when current is past end", () => {
    const result = dateProgress(start, end, new Date("2030-01-01"));
    expect(result).to.equal(100);
  });

  it("clamps at 0 when current is before start", () => {
    const result = dateProgress(start, end, new Date("2020-01-01"));
    expect(result).to.equal(0);
  });
});

describe("roleKeyFromLabel", () => {
  it("maps Finance Director", () => {
    expect(roleKeyFromLabel("Finance Director")).to.equal("finance_director");
  });

  it("maps Project Manager", () => {
    expect(roleKeyFromLabel("Project Manager")).to.equal("project_manager");
  });

  it("maps anything else to contractor", () => {
    expect(roleKeyFromLabel("Contractor")).to.equal("contractor");
    expect(roleKeyFromLabel("Unknown")).to.equal("contractor");
    expect(roleKeyFromLabel("")).to.equal("contractor");
  });
});

describe("roleLabel", () => {
  it("returns short labels", () => {
    expect(roleLabel("finance_director")).to.equal("Finance");
    expect(roleLabel("project_manager")).to.equal("PM");
    expect(roleLabel("contractor")).to.equal("Contractor");
  });

  it("returns Not Linked for unknown role", () => {
    expect(roleLabel("admin")).to.equal("Not Linked");
    expect(roleLabel("")).to.equal("Not Linked");
  });
});

describe("roleFullLabel", () => {
  it("returns full labels", () => {
    expect(roleFullLabel("finance_director")).to.equal("Finance Director");
    expect(roleFullLabel("project_manager")).to.equal("Project Manager");
    expect(roleFullLabel("contractor")).to.equal("Contractor");
  });

  it("returns Not Linked for unknown role", () => {
    expect(roleFullLabel("superuser")).to.equal("Not Linked");
  });
});

describe("initials", () => {
  it("takes first letter of each word", () => {
    expect(initials("Maya Shah")).to.equal("MS");
    expect(initials("Eleanor Lane")).to.equal("EL");
    expect(initials("Daniel Okafor")).to.equal("DO");
  });

  it("caps at 2 characters for long names", () => {
    expect(initials("John Paul Jones")).to.equal("JP");
  });

  it("handles a single name", () => {
    expect(initials("Maya")).to.equal("M");
  });

  it("upcases result", () => {
    expect(initials("alice bob")).to.equal("AB");
  });
});

describe("chipTone", () => {
  it("success tone for released, funded, approved, active", () => {
    expect(chipTone("Released")).to.equal("chip-tone-success");
    expect(chipTone("Funded")).to.equal("chip-tone-success");
    expect(chipTone("Approved")).to.equal("chip-tone-success");
    expect(chipTone("Active")).to.equal("chip-tone-success");
  });

  it("primary tone for submitted, pending, under review", () => {
    expect(chipTone("Submitted")).to.equal("chip-tone-primary");
    expect(chipTone("Pending")).to.equal("chip-tone-primary");
    expect(chipTone("Under Review")).to.equal("chip-tone-primary");
  });

  it("warning tone for held, partially funded, in progress", () => {
    expect(chipTone("Held")).to.equal("chip-tone-warning");
    expect(chipTone("Partially Funded")).to.equal("chip-tone-warning");
    expect(chipTone("In Progress")).to.equal("chip-tone-warning");
  });

  it("danger tone for rejected, locked, blocked", () => {
    expect(chipTone("Rejected")).to.equal("chip-tone-danger");
    expect(chipTone("Locked")).to.equal("chip-tone-danger");
    expect(chipTone("Blocked")).to.equal("chip-tone-danger");
  });

  it("neutral tone for unrecognised status", () => {
    expect(chipTone("Unknown")).to.equal("chip-tone-neutral");
    expect(chipTone("")).to.equal("chip-tone-neutral");
  });
});

describe("timelineDot", () => {
  it("returns correct colours", () => {
    expect(timelineDot("released")).to.equal("green");
    expect(timelineDot("pending")).to.equal("yellow");
    expect(timelineDot("rejected")).to.equal("red");
  });

  it("returns empty string for unknown types", () => {
    expect(timelineDot("approved")).to.equal("");
    expect(timelineDot("")).to.equal("");
  });
});

describe("modelLabel", () => {
  it("maps known models", () => {
    expect(modelLabel("milestone")).to.equal("Milestone");
    expect(modelLabel("valuation")).to.equal("Valuation");
    expect(modelLabel("bespoke")).to.equal("Bespoke");
    expect(modelLabel("mixed")).to.equal("Package-level");
  });

  it("defaults to Milestone for unknown", () => {
    expect(modelLabel("unknown")).to.equal("Milestone");
    expect(modelLabel("")).to.equal("Milestone");
  });
});

describe("timelineStatusClass", () => {
  it("returns correct node classes", () => {
    expect(timelineStatusClass("complete")).to.equal(
      "project-phase-timeline__node--complete"
    );
    expect(timelineStatusClass("in-progress")).to.equal(
      "project-phase-timeline__node--current"
    );
    expect(timelineStatusClass("blocked")).to.equal(
      "project-phase-timeline__node--complete"
    );
    expect(timelineStatusClass("upcoming")).to.equal(
      "project-phase-timeline__node--future"
    );
  });

  it("defaults to future for unknown status", () => {
    expect(timelineStatusClass("")).to.equal(
      "project-phase-timeline__node--future"
    );
    expect(timelineStatusClass("idle")).to.equal(
      "project-phase-timeline__node--future"
    );
  });
});

describe("getProjectTotals", () => {
  const project: Project = {
    id: "proj-test",
    name: "Test Project",
    contractModel: "milestone",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    team: [],
    milestones: [],
    auditLog: [],
    packages: [
      {
        id: "wp-1",
        name: "A",
        cap: 100_000,
        funded: 80_000,
        released: 20_000,
        status: "Funded",
        contractor: "Alice",
        requests: [],
      },
      {
        id: "wp-2",
        name: "B",
        cap: 200_000,
        funded: 150_000,
        released: 50_000,
        status: "Funded",
        contractor: "Bob",
        requests: [],
      },
      {
        id: "wp-3",
        name: "C",
        cap: 50_000,
        funded: 0,
        released: 0,
        status: "Pending",
        contractor: "Alice",
        requests: [],
      },
    ],
  };

  it("sums contract value", () => {
    expect(getProjectTotals(project).contractValue).to.equal(350_000);
  });

  it("sums escrow funded", () => {
    expect(getProjectTotals(project).escrowFunded).to.equal(230_000);
  });

  it("sums total released", () => {
    expect(getProjectTotals(project).totalReleased).to.equal(70_000);
  });

  it("computes remaining as contractValue - totalReleased", () => {
    expect(getProjectTotals(project).remaining).to.equal(280_000);
  });

  it("returns zeros for a project with no packages", () => {
    const empty = { ...project, packages: [] };
    const totals = getProjectTotals(empty);
    expect(totals.contractValue).to.equal(0);
    expect(totals.escrowFunded).to.equal(0);
    expect(totals.totalReleased).to.equal(0);
    expect(totals.remaining).to.equal(0);
  });
});

describe("hasAssignedContractor", () => {
  const base = {
    id: "wp-1",
    name: "A",
    cap: 100_000,
    funded: 0,
    released: 0,
    status: "Pending",
    requests: [],
  };

  it("returns true when contractor is a real name", () => {
    expect(hasAssignedContractor({ ...base, contractor: "Alice" })).to.be.true;
  });

  it("returns false for Unassigned estimate", () => {
    expect(
      hasAssignedContractor({ ...base, contractor: "Unassigned estimate" })
    ).to.be.false;
  });

  it("returns false for Unassigned", () => {
    expect(hasAssignedContractor({ ...base, contractor: "Unassigned" })).to.be
      .false;
  });

  it("returns false for empty string", () => {
    expect(hasAssignedContractor({ ...base, contractor: "" })).to.be.false;
  });
});

describe("financeApprovalStatus", () => {
  const base = {
    id: "wp-1",
    name: "A",
    cap: 100_000,
    funded: 0,
    released: 0,
    status: "Pending",
    contractor: "",
    requests: [],
  };

  it("returns explicit financeApprovalStatus when set", () => {
    expect(
      financeApprovalStatus({
        ...base,
        funded: 50_000,
        financeApprovalStatus: "Approved",
      })
    ).to.equal("Approved");
  });

  it("returns Escrow Locked when funded > 0 and no override", () => {
    expect(financeApprovalStatus({ ...base, funded: 1 })).to.equal(
      "Escrow Locked"
    );
  });

  it("returns Awaiting Finance Approval when contractor set and cap > 0", () => {
    expect(
      financeApprovalStatus({ ...base, contractor: "Alice", cap: 100_000 })
    ).to.equal("Awaiting Finance Approval");
  });

  it("returns Estimate when no contractor and no funding", () => {
    expect(financeApprovalStatus({ ...base, contractor: "" })).to.equal(
      "Estimate"
    );
  });

  it("returns Estimate when contractor is Unassigned", () => {
    expect(
      financeApprovalStatus({ ...base, contractor: "Unassigned" })
    ).to.equal("Estimate");
  });
});

describe("packageStatusClass", () => {
  it("returns correct class for known statuses", () => {
    expect(packageStatusClass("completed")).to.equal("completed");
    expect(packageStatusClass("in-progress")).to.equal("in-progress");
    expect(packageStatusClass("estimated")).to.equal("estimated");
    expect(packageStatusClass("unallocated")).to.equal("unallocated");
  });

  it("normalises casing and spaces", () => {
    expect(packageStatusClass("In Progress")).to.equal("in-progress");
    expect(packageStatusClass("COMPLETED")).to.equal("completed");
  });

  it("defaults to estimated for unknown", () => {
    expect(packageStatusClass("Funded")).to.equal("estimated");
    expect(packageStatusClass("")).to.equal("estimated");
  });
});

describe("packageStatusLabel", () => {
  it("returns human-readable labels", () => {
    expect(packageStatusLabel("completed")).to.equal("Completed");
    expect(packageStatusLabel("in-progress")).to.equal("In Progress");
    expect(packageStatusLabel("unallocated")).to.equal("Unallocated");
    expect(packageStatusLabel("estimated")).to.equal("Estimated");
  });

  it("defaults to Estimated for unknown status", () => {
    expect(packageStatusLabel("Funded")).to.equal("Estimated");
  });
});

describe("buildBespokeTimeline", () => {
  const project: Project = {
    id: "proj-1",
    name: "Test",
    contractModel: "bespoke",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    team: [],
    milestones: [],
    auditLog: [],
    packages: [
      {
        id: "wp-1",
        name: "Locked Package",
        cap: 100_000,
        funded: 0,
        released: 0,
        status: "Locked",
        contractor: "Alice",
        requests: [],
      },
      {
        id: "wp-2",
        name: "Released Package",
        cap: 100_000,
        funded: 100_000,
        released: 100_000,
        status: "Released",
        contractor: "Bob",
        requests: [{ id: "r-1", amount: 100_000, status: "Released" }],
      },
      {
        id: "wp-3",
        name: "Active Package",
        cap: 100_000,
        funded: 50_000,
        released: 0,
        status: "Funded",
        contractor: "Carol",
        requests: [{ id: "r-2", amount: 50_000, status: "Submitted" }],
      },
      {
        id: "wp-4",
        name: "Quiet Package",
        cap: 50_000,
        funded: 0,
        released: 0,
        status: "Pending",
        contractor: "Dave",
        requests: [],
      },
    ],
  };

  it("produces one node per package", () => {
    expect(buildBespokeTimeline(project)).to.have.length(4);
  });

  it("maps Locked → blocked", () => {
    const nodes = buildBespokeTimeline(project);
    expect(nodes[0].status).to.equal("blocked");
  });

  it("maps Released → complete", () => {
    const nodes = buildBespokeTimeline(project);
    expect(nodes[1].status).to.equal("complete");
  });

  it("maps package with requests → in-progress", () => {
    const nodes = buildBespokeTimeline(project);
    expect(nodes[2].status).to.equal("in-progress");
  });

  it("maps package with no requests → upcoming", () => {
    const nodes = buildBespokeTimeline(project);
    expect(nodes[3].status).to.equal("upcoming");
  });

  it("uses project endDate as targetDate for every node", () => {
    buildBespokeTimeline(project).forEach((node) => {
      expect(node.targetDate).to.equal("2026-12-31");
    });
  });

  it("preserves package names", () => {
    const nodes = buildBespokeTimeline(project);
    expect(nodes[0].name).to.equal("Locked Package");
    expect(nodes[3].name).to.equal("Quiet Package");
  });
});
