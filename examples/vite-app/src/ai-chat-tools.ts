import { defineAIChatTool, type NavigateFunction } from "@tailor-platform/app-shell";
import { z } from "zod/v4";

export function createAIChatTools(navigate: NavigateFunction) {
  return {
    navigateToPage: defineAIChatTool({
      description:
        "Open an example page only when the user asks to navigate. " +
        "/dashboard: dashboard; /dashboard/orders: orders; /dashboard/products: products; " +
        "/settings: settings; /dashboard/panels: body slot demo. This does not modify data.",
      schema: z.object({
        path: z.enum([
          "/dashboard",
          "/dashboard/orders",
          "/dashboard/products",
          "/settings",
          "/dashboard/panels",
        ]),
      }),
      async execute({ path }, { signal }) {
        signal.throwIfAborted();
        await navigate(path);
        return { path };
      },
    }),
  };
}
