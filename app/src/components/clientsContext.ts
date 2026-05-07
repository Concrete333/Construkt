import { createContext, useContext } from "react";
import type { AppClients } from "../lib/clients";

export const ClientsContext = createContext<AppClients | null>(null);

export const useClients = (): AppClients => {
  const value = useContext(ClientsContext);
  if (!value) {
    throw new Error("useClients() called outside <ClientsProvider>");
  }
  return value;
};
