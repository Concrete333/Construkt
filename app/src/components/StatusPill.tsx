import "./StatusPill.css";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "error";

export interface StatusPillProps {
  tone: StatusTone;
  children: React.ReactNode;
}

/**
 * Small label component used wherever a status badge / chip appears
 * (project status, package status, payment-request status, hold flags).
 * Tone names match the `ApprovalChipTone` set produced by the payment
 * selectors so component code can pass the selector output through
 * unchanged.
 */
export const StatusPill = ({ tone, children }: StatusPillProps) => (
  <span className="status-pill" data-tone={tone}>
    {children}
  </span>
);
