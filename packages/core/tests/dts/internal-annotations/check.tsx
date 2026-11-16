import { AppShell, createAuthClient, type EnhancedAuthClient } from "@tailor-platform/app-shell";
import { AppShell as LegacyAppShell } from "@tailor-platform/app-shell/testing";

declare const client: EnhancedAuthClient;
declare const createdClient: ReturnType<typeof createAuthClient>;

export const appUri: string = client.getAppUri();
export const createdAppUri: string = createdClient.getAppUri();

// @ts-expect-error Internal callback methods must not appear in published types.
client.getCallbackStatusSnapshot?.();
// @ts-expect-error Internal subscriptions must not appear in published types.
client.subscribeCallbackStatus?.(() => {});
// @ts-expect-error Factory return types must also exclude internal callback methods.
createdClient.getCallbackStatusSnapshot?.();

// @ts-expect-error Internal page configuration must not appear in published types.
void AppShell.WithPages;
// @ts-expect-error The deprecated shell must not expose internal page configuration either.
void LegacyAppShell.WithPages;
