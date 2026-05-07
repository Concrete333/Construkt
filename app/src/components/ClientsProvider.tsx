import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { buildDemoClients } from "../lib/clients";
import type { AppClients } from "../lib/clients";
import { ClientsContext } from "./clientsContext";

export interface ClientsProviderProps {
  children: ReactNode;
  /** Optional pre-built bundle for tests or alternative composition roots. */
  override?: AppClients;
  /** Optional composition hook to choose how clients are built. */
  buildClients?: () => Promise<AppClients>;
  /** Rendered while the demo seed is running. */
  fallback?: ReactNode;
}

export const ClientsProvider = ({
  children,
  override,
  buildClients,
  fallback,
}: ClientsProviderProps) => {
  const [clients, setClients] = useState<AppClients | null>(override ?? null);
  const [bootstrapError, setBootstrapError] = useState<unknown>(null);

  useEffect(() => {
    if (override) return;
    let cancelled = false;
    const builder = buildClients ?? buildDemoClients;
    void builder()
      .then((built) => {
        if (!cancelled) {
          setBootstrapError(null);
          setClients(built);
        }
      })
      .catch((err) => {
        if (!cancelled) setBootstrapError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [buildClients, override]);

  if (bootstrapError) {
    const message =
      bootstrapError instanceof Error
        ? bootstrapError.message
        : String(bootstrapError);
    return (
      <div
        style={{
          padding: "1rem",
          color: "var(--color-error)",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
        }}
      >
        Failed to initialize app clients.
        {"\n"}
        {message}
      </div>
    );
  }

  if (!clients) return <>{fallback ?? null}</>;
  return (
    <ClientsContext.Provider value={clients}>
      {children}
    </ClientsContext.Provider>
  );
};
