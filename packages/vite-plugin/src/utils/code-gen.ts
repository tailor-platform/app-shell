import type { PageFile } from "./scanner";

/**
 * Generate the virtual module code.
 */
export function generateVirtualModuleCode(pages: PageFile[]): string {
  const imports: string[] = [];
  const pageEntries: string[] = [];

  pages.forEach((page, index) => {
    const importPath = page.filePath.replace(/\\/g, "/");
    imports.push(`import Page${index} from "${importPath}";`);

    const routePath = page.routePath ? `/${page.routePath}` : "/";
    pageEntries.push(`  { path: "${routePath}", component: Page${index} }`);
  });

  return `
${imports.join("\n")}

export const pages = [
${pageEntries.join(",\n")}
];

export default pages;
`.trim();
}
