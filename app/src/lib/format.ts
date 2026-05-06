/**
 * Mock USDC has six decimals to mirror real USDC. All on-chain amounts are
 * stored in base units (a `bigint`); UI consumers should always go through
 * these helpers rather than dividing themselves so rounding rules stay
 * consistent across the demo.
 */
export const MOCK_USDC_DECIMALS = 6;
export const MOCK_USDC_SYMBOL = "USDC";

export interface FormatMoneyOptions {
  /** Token decimals. Defaults to 6 (mock USDC). */
  decimals?: number;
  /**
   * Number of fraction digits to display. Defaults to 2 (USD-style).
   * Truncates rather than rounds — finance demos show what's actually
   * locked, not what's been rounded up.
   */
  fractionDigits?: number;
  /** Append a unit symbol (e.g. "200.00 USDC"). Off by default. */
  withSymbol?: boolean;
  /** Override the default symbol used when `withSymbol` is true. */
  symbol?: string;
  /** Comma-separate the whole part. Defaults to true. */
  groupThousands?: boolean;
}

const groupThousandsString = (whole: string): string =>
  whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const formatMockUsdc = (
  baseUnits: bigint,
  opts: FormatMoneyOptions = {},
): string => {
  const decimals = opts.decimals ?? MOCK_USDC_DECIMALS;
  const fractionDigits = opts.fractionDigits ?? 2;
  const groupThousands = opts.groupThousands ?? true;
  const symbol = opts.symbol ?? MOCK_USDC_SYMBOL;

  if (decimals < 0) throw new RangeError("decimals must be non-negative");
  if (fractionDigits < 0)
    throw new RangeError("fractionDigits must be non-negative");

  const negative = baseUnits < 0n;
  const abs = negative ? -baseUnits : baseUnits;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  let fraction = abs % divisor;

  if (fractionDigits < decimals) {
    const truncDivisor = 10n ** BigInt(decimals - fractionDigits);
    fraction = fraction / truncDivisor;
  } else if (fractionDigits > decimals) {
    fraction = fraction * 10n ** BigInt(fractionDigits - decimals);
  }

  const wholeStr = groupThousands
    ? groupThousandsString(whole.toString())
    : whole.toString();
  const sign = negative ? "-" : "";
  const numeric =
    fractionDigits === 0
      ? wholeStr
      : `${wholeStr}.${fraction.toString().padStart(fractionDigits, "0")}`;
  return opts.withSymbol ? `${sign}${numeric} ${symbol}` : `${sign}${numeric}`;
};

/**
 * Parse a user-entered amount (e.g. "200.50" or "1,234.5") into mock USDC
 * base units. Throws on empty input, non-numeric input, or more fraction
 * digits than the mint's decimals supports.
 */
export const parseMockUsdc = (
  input: string,
  opts: { decimals?: number } = {},
): bigint => {
  const decimals = opts.decimals ?? MOCK_USDC_DECIMALS;
  const trimmed = input.trim().replace(/,/g, "");
  if (trimmed.length === 0) throw new Error("Empty amount");

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) throw new Error(`Invalid amount: ${input}`);

  const [, sign, wholePart, fractionPart = ""] = match;
  if (fractionPart.length > decimals) {
    throw new Error(
      `Too many fraction digits for ${decimals}-decimal token: ${input}`,
    );
  }

  const padded = fractionPart.padEnd(decimals, "0");
  const totalStr = `${wholePart}${padded}`;
  const magnitude = totalStr === "" ? 0n : BigInt(totalStr);
  return sign === "-" ? -magnitude : magnitude;
};
