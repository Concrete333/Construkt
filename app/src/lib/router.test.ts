import { describe, expect, it } from "vitest";
import { buildHash, parseHash } from "./router";

describe("parseHash", () => {
  it("defaults to home for empty input", () => {
    expect(parseHash("").key).toBe("home");
    expect(parseHash("#").key).toBe("home");
  });

  it("maps known paths", () => {
    expect(parseHash("#projects").key).toBe("projects");
    expect(parseHash("#project-detail").key).toBe("projectDetail");
    expect(parseHash("#work-package-view").key).toBe("workPackageView");
    expect(parseHash("#dashboard2").key).toBe("dashboard2");
    expect(parseHash("#settings").key).toBe("settings");
    expect(parseHash("#signin").key).toBe("signin");
  });

  it("aliases legacy paths from the prototype", () => {
    expect(parseHash("#dashboard").key).toBe("dashboard2");
    expect(parseHash("#work-package-detail").key).toBe("workPackageView");
  });

  it("falls back to home for unknown paths", () => {
    expect(parseHash("#whatever").key).toBe("home");
  });

  it("parses query params", () => {
    const route = parseHash("#project-detail?address=abc123");
    expect(route.key).toBe("projectDetail");
    expect(route.params).toEqual({ address: "abc123" });
  });

  it("decodes URI-escaped values", () => {
    const route = parseHash(
      "#work-package-view?ref=metadata%3A%2F%2Fdemo%2Fpackage%2Ffoundation",
    );
    expect(route.params.ref).toBe("metadata://demo/package/foundation");
  });

  it("handles multiple params", () => {
    const route = parseHash("#project-detail?a=1&b=2");
    expect(route.params).toEqual({ a: "1", b: "2" });
  });
});

describe("buildHash", () => {
  it("round-trips with parseHash for known routes", () => {
    expect(parseHash(buildHash("projects")).key).toBe("projects");
    expect(parseHash(buildHash("workPackageView")).key).toBe("workPackageView");
  });

  it("encodes query params", () => {
    const hash = buildHash("projectDetail", { address: "abc=123" });
    const parsed = parseHash(hash);
    expect(parsed.key).toBe("projectDetail");
    expect(parsed.params.address).toBe("abc=123");
  });

  it("omits the query string when there are no params", () => {
    expect(buildHash("projects")).toBe("#projects");
  });
});
