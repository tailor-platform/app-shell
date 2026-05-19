import {
  db,
  unsafeAllowAllGqlPermission,
  unsafeAllowAllTypePermission,
} from "@tailor-platform/sdk";

export const user = db
  .type("User", "A user account for E2E testing", {
    name: db.string().description("Display name of the user"),
    email: db.string().unique().description("Email address used for authentication"),
    roles: db.string({ array: true }).description("List of roles assigned to the user"),
  })
  .permission(unsafeAllowAllTypePermission)
  .gqlPermission(unsafeAllowAllGqlPermission);
