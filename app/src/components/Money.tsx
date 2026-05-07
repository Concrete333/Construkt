import { formatMockUsdc } from "../lib/format";
import type { FormatMoneyOptions } from "../lib/format";

export interface MoneyProps extends FormatMoneyOptions {
  amount: bigint;
}

/**
 * Display a token base-units amount as mock USDC. Single component so
 * the entire UI stays consistent with `formatMockUsdc`'s truncate-not-
 * round contract; nothing else should call `formatMockUsdc` from JSX.
 */
export const Money = ({ amount, ...opts }: MoneyProps) => (
  <span className="money">{formatMockUsdc(amount, opts)}</span>
);
