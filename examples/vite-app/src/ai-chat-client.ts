import { createAIGatewayClient, createAuthClient } from "@tailor-platform/app-shell";

const appUri = import.meta.env.VITE_TAILOR_APP_URL;
const clientId = import.meta.env.VITE_TAILOR_CLIENT_ID;
const gatewayUri = import.meta.env.VITE_TAILOR_AI_GATEWAY_URL;

export const authClient =
  appUri && clientId && gatewayUri ? createAuthClient({ appUri, clientId }) : null;

export const aiClient = authClient ? createAIGatewayClient({ gatewayUri, authClient }) : null;
