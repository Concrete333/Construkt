import { useClients } from "../components/clientsContext";
import { walletForRole } from "../lib/clients";
import { shortAddress } from "../lib/format";
import { DEMO_ROLES, DEMO_ROLE_LABEL } from "../lib/theme";
import type { DemoRole } from "../lib/theme";
import "./SignInPage.css";

interface SignInPageProps {
  /** Hoisted from App.tsx so the picked role survives the navigation. */
  onSelectRole: (role: DemoRole) => void;
}

/**
 * One short sentence per role explaining what's on the dashboard for them.
 * Surface copy only; actual permissions are enforced on chain.
 */
const ROLE_BLURB: Record<DemoRole, string> = {
  financeDirector:
    "Cross-project KPIs, fund packages, place / remove holds, release approved payments.",
  projectManager:
    "Approve contractor invoices as PM (low approver), reject with notes, drive package progress.",
  director:
    "Use an optional high-approver role when a package requires another sign-off after PM approval.",
  contractor:
    "Submit invoices on assigned packages, attach documents, track release status.",
};

export const SignInPage = ({ onSelectRole }: SignInPageProps) => {
  const { world } = useClients();
  return (
    <section className="sign-in">
      <header className="sign-in__head">
        <p className="sign-in__eyebrow">Review sign-in - no real auth</p>
        <h1>Pick a product role</h1>
        <p className="sign-in__lead">
          Each role is wired to a deterministic account seeded into the review
          state. Switch any time from the header.
        </p>
      </header>
      <ul className="sign-in__roles">
        {DEMO_ROLES.map((role) => {
          const wallet = walletForRole(world, role);
          return (
            <li key={role} className="sign-in__role">
              <a
                className="sign-in__role-link"
                href="#dashboard2"
                onClick={() => onSelectRole(role)}
              >
                <p className="sign-in__role-label">{DEMO_ROLE_LABEL[role]}</p>
                <p className="sign-in__role-wallet">
                  {shortAddress(wallet.toBase58(), { head: 6, tail: 6 })}
                </p>
                <p className="sign-in__role-blurb">{ROLE_BLURB[role]}</p>
                <span className="sign-in__role-cta" aria-hidden="true">
                  Continue -&gt;
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
