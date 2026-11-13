import { useState, type ComponentProps } from "react";
import { AuthProvider, type AuthState } from "../contexts/auth-context";
import { createMemoryAuthClient, type MemoryAuthClient } from "./memory-auth-client";

export type MemoryAuthProviderProps = Pick<
  ComponentProps<typeof AuthProvider>,
  "children" | "guardComponent" | "autoLogin"
> &
  (
    | { initialState?: AuthState; client?: never }
    | { client: MemoryAuthClient; initialState?: never }
  );

/**
 * The real AuthProvider backed by an isolated, in-memory auth client.
 *
 * `initialState` is read only on mount and defaults to ready and signed out.
 * Supply an external `client` to control loading or change state after rendering.
 * Login and logout succeed locally; OAuth and authenticated transport are not simulated.
 */
export function MemoryAuthProvider({ client, initialState, ...props }: MemoryAuthProviderProps) {
  const [ownedClient] = useState(() => createMemoryAuthClient(initialState));

  if (client !== undefined && initialState !== undefined) {
    throw new Error("MemoryAuthProvider accepts either client or initialState, not both.");
  }

  return <AuthProvider {...props} client={client ?? ownedClient} />;
}
