import { useEffect, useState } from "react";
import type { PublicKey } from "@solana/web3.js";
import { shortAddress } from "../lib/format";
import "./WalletDisplay.css";

export interface WalletDisplayProps {
  wallet: PublicKey;
}

/**
 * Shows the demo wallet that would sign for the current role. This is
 * deliberately separate from the role display per the plan's
 * "Role visibility is not authorization" rule. The signing pubkey may not
 * match the visible role. Click to copy the full base58 for on-chain
 * debugging.
 */
export const WalletDisplay = ({ wallet }: WalletDisplayProps) => {
  const base58 = wallet.toBase58();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const handle = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(handle);
  }, [copied]);

  const onClick = () => {
    void navigator.clipboard?.writeText(base58).then(() => setCopied(true));
  };

  return (
    <button
      type="button"
      className="wallet-display"
      onClick={onClick}
      aria-label={`Copy demo wallet address ${base58}`}
      title={base58}
    >
      <span className="wallet-display__caption">Demo wallet</span>
      <span className="wallet-display__value">
        {shortAddress(base58, { head: 4, tail: 4 })}
      </span>
      <span
        className="wallet-display__feedback"
        data-state={copied ? "copied" : "idle"}
        aria-live="polite"
      >
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
};
