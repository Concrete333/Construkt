import { networkBadgeContent } from "../lib/theme";
import type { DemoNetwork } from "../lib/theme";
import "./NetworkBadge.css";

export interface NetworkBadgeProps {
  network: DemoNetwork;
}

/**
 * Pure display badge that surfaces the active review network and explicitly
 * signals that funds are mock USDC, never real. Replaces the prototype's
 * generic "SOLANA DEVNET" string. Never renders mainnet; see
 * `networkBadgeContent` for the formatter contract.
 */
export const NetworkBadge = ({ network }: NetworkBadgeProps) => {
  const { label } = networkBadgeContent(network);
  return (
    <span className="network-badge" data-network={network}>
      <span className="network-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
};
