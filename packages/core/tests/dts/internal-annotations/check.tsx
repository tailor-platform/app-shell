import { createAuthClient, type EnhancedAuthClient } from "@tailor-platform/app-shell";

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
