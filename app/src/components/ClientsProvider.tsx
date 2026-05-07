import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { buildDemoClients } from "../lib/clients";
import type { AppClients } from "../lib/clients";
import { ClientsContext } from "./clientsContext";

export interface ClientsProviderProps {
  children: ReactNode;
  /** Optional pre-built bundle for tests or alternative composition roots. */
  override?: AppClients;
  /** Rendered while the demo seed is running. */
  fallback?: ReactNode;
}

export const ClientsProvider = ({
  children,
  override,
  fallback,
}: ClientsProviderProps) => {
  const [clients, setClients] = useState<AppClients | null>(override ?? null);

  useEffect(() => {
    if (override) return;
    let cancelled = false;
    void buildDemoClients().then((built) => {
      if (!cancelled) setClients(built);
    });
    return () => {
      cancelled = true;
    };
  }, [override]);

  if (!clients) return <>{fallback ?? null}</>;
  return (
    <ClientsContext.Provider value={clients}>
      {children}
    </ClientsContext.Provider>
  );
};
