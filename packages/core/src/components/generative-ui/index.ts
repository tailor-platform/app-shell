import { reportCard } from "./report";

export { defineGenerativeUI } from "./generative-ui";
export type {
  GenerativeUICardDefinition,
  GenerativeUIDocument,
  GenerativeUIRendererProps,
} from "./types";

/** Opt-in read-only cards. Only registered definitions are exposed to the model. */
export const generativeUICards = { report: reportCard };
