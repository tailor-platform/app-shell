export const PANEL_SECTIONS: readonly { title: string; children?: readonly string[] }[] = [
  { title: "Introduction" },
  { title: "Installing", children: ["Configuration"] },
  { title: "Authoring documents", children: ["Review workflow", "Publishing"] },
  { title: "Troubleshooting" },
];

export const sectionId = (title: string) => `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
