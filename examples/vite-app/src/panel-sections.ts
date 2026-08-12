export const PANEL_SECTIONS = [
  "Introduction",
  "Installing",
  "Configuration",
  "Authoring documents",
  "Review workflow",
  "Publishing",
  "Troubleshooting",
] as const;

export const sectionId = (title: string) => `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
