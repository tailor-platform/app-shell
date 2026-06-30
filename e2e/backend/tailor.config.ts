import { defineAIGateway, defineAuth, defineConfig, defineIdp } from "@tailor-platform/sdk";
import { user } from "./src/tailordb/user";

const oauth2Config = {
  redirectURIs: ["http://localhost:3100" as const],
  grantTypes: ["authorization_code" as const, "refresh_token" as const],
};

const idp = defineIdp("e2e-idp", {
  clients: ["e2e-idp-client"],
  permission: {
    create: [{ conditions: [], permit: true }],
    read: [{ conditions: [], permit: true }],
    update: [{ conditions: [], permit: true }],
    delete: [{ conditions: [], permit: true }],
    sendPasswordResetEmail: [{ conditions: [], permit: true }],
  },
});

const auth = defineAuth("e2e-auth", {
  userProfile: {
    type: user,
    usernameField: "email",
    attributes: { roles: true },
  },
  oauth2Clients: {
    "e2e-oauth2-client-public": {
      ...oauth2Config,
      clientType: "public",
    },
  },
  idProvider: idp.provider(idp.name, idp.clients[0]),
});

const aiGateway = defineAIGateway("e2e-ai-gateway", {
  authNamespace: auth.name,
  cors: [oauth2Config.redirectURIs[0]],
});

export default defineConfig({
  // SDK-managed app id — do not edit, except when copying this config to a separate app.
  id: "c1f3a27c-3771-4ca9-99ae-fb38b435bbbc",
  name: "app-shell-e2e",
  cors: [oauth2Config.redirectURIs[0]],

  db: {
    "e2e-db": { files: [`./src/tailordb/**/*.ts`] },
  },

  auth,
  idp: [idp],
  aiGateways: [aiGateway],
});
