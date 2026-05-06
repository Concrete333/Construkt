import { describe, expect, it } from "vitest";
import { formatMockUsdc, parseMockUsdc } from "./format";

describe("formatMockUsdc", () => {
  it("formats whole amounts with two decimals by default", () => {
    expect(formatMockUsdc(0n)).toBe("0.00");
    expect(formatMockUsdc(1_000_000n)).toBe("1.00");
    expect(formatMockUsdc(200_000_000n)).toBe("200.00");
  });

  it("groups thousands with commas", () => {
    expect(formatMockUsdc(1_234_567_890n)).toBe("1,234.56");
    expect(formatMockUsdc(1_000_000_000_000n)).toBe("1,000,000.00");
  });

  it("truncates rather than rounds", () => {
    // 1.999999 USDC → 1.99 with two fraction digits
    expect(formatMockUsdc(1_999_999n)).toBe("1.99");
    expect(formatMockUsdc(199_999n)).toBe("0.19");
    expect(formatMockUsdc(1n)).toBe("0.00");
  });

  it("handles negative values", () => {
    expect(formatMockUsdc(-1_000_000n)).toBe("-1.00");
    expect(formatMockUsdc(-1_234_567n)).toBe("-1.23");
  });

  it("appends the symbol when withSymbol is set", () => {
    expect(formatMockUsdc(1_000_000n, { withSymbol: true })).toBe("1.00 USDC");
    expect(
      formatMockUsdc(1_000_000n, { withSymbol: true, symbol: "mUSDC" }),
    ).toBe("1.00 mUSDC");
  });

  it("supports zero fraction digits and full-precision modes", () => {
    expect(formatMockUsdc(1_500_000n, { fractionDigits: 0 })).toBe("1");
    expect(formatMockUsdc(1_500_000n, { fractionDigits: 6 })).toBe("1.500000");
  });

  it("can disable thousands grouping", () => {
    expect(formatMockUsdc(1_234_567_890n, { groupThousands: false })).toBe(
      "1234.56",
    );
  });

  it("pads sub-cent amounts to the correct number of fraction digits", () => {
    expect(formatMockUsdc(50n, { fractionDigits: 6 })).toBe("0.000050");
  });
});

describe("parseMockUsdc", () => {
  it("parses whole and fractional amounts", () => {
    expect(parseMockUsdc("1")).toBe(1_000_000n);
    expect(parseMockUsdc("1.00")).toBe(1_000_000n);
    expect(parseMockUsdc("1.5")).toBe(1_500_000n);
    expect(parseMockUsdc("200.50")).toBe(200_500_000n);
  });

  it("handles thousands separators in input", () => {
    expect(parseMockUsdc("1,234.56")).toBe(1_234_560_000n);
  });

  it("parses sub-cent precision down to one base unit", () => {
    expect(parseMockUsdc("0.000001")).toBe(1n);
  });

  it("parses negative amounts", () => {
    expect(parseMockUsdc("-1.00")).toBe(-1_000_000n);
  });

  it("rejects empty or non-numeric input", () => {
    expect(() => parseMockUsdc("")).toThrow();
    expect(() => parseMockUsdc("   ")).toThrow();
    expect(() => parseMockUsdc("abc")).toThrow();
    expect(() => parseMockUsdc("1.2.3")).toThrow();
  });

  it("rejects too many fraction digits for the mint", () => {
    expect(() => parseMockUsdc("1.0000001")).toThrow();
  });

  it("round-trips with formatMockUsdc at full precision", () => {
    const original = 12_345_678n;
    const formatted = formatMockUsdc(original, {
      fractionDigits: 6,
      groupThousands: false,
    });
    expect(parseMockUsdc(formatted)).toBe(original);
  });
});
