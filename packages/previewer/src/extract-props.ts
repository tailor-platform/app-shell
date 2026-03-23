import { Project, type SourceFile, TypeFormatFlags } from "ts-morph";
import { resolve } from "node:path";

export type PropInfo = {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
};

// Cache ts-morph Project instances by tsconfig path to avoid re-creation.
const projectCache = new Map<string, Project>();

function getProject(tsconfigPath?: string): Project {
  const key = tsconfigPath ?? "__default__";
  let project = projectCache.get(key);
  if (!project) {
    project = tsconfigPath
      ? new Project({ tsConfigFilePath: tsconfigPath })
      : new Project({ compilerOptions: { strict: true } });
    projectCache.set(key, project);
  }
  return project;
}

const sourceFileCache = new Map<string, SourceFile>();

function getSourceFile(project: Project, filePath: string): SourceFile {
  const absPath = resolve(filePath);
  let sf = sourceFileCache.get(absPath);
  if (sf) return sf;

  sf = project.getSourceFile(absPath);
  if (!sf) {
    sf = project.addSourceFileAtPath(absPath);
  }
  sourceFileCache.set(absPath, sf);
  return sf;
}

export function extractProps(
  filePath: string,
  typeName: string,
  tsconfigPath?: string,
): PropInfo[] {
  const project = getProject(tsconfigPath);
  const sourceFile = getSourceFile(project, filePath);

  const typeAlias = sourceFile.getTypeAlias(typeName);
  const iface = sourceFile.getInterface(typeName);
  const declaration = typeAlias ?? iface;

  if (!declaration) {
    console.warn(
      `[remark-props-table] Type "${typeName}" not found in ${filePath}`,
    );
    return [];
  }

  const type = declaration.getType();
  const properties = type.getProperties();
  const typeChecker = project.getTypeChecker();

  const props: PropInfo[] = properties.map((prop) => {
    const name = prop.getName();
    const valueDecl = prop.getValueDeclaration();

    // Use getTypeOfSymbolAtLocation for reliable resolution of Pick<>, intersection types, etc.
    // Falls back to valueDecl.getType() only if the symbol-based approach fails.
    const symbolType = typeChecker.getTypeOfSymbolAtLocation(prop, declaration);
    const propType =
      symbolType.getText() !== "any"
        ? symbolType
        : valueDecl
          ? valueDecl.getType()
          : prop.getDeclaredType();

    let typeText = propType.getText(
      valueDecl ?? undefined,
      TypeFormatFlags.NoTruncation,
    );
    // Strip import("..."). prefixes for readability
    typeText = typeText.replace(/import\([^)]*\)\./g, "");

    const isOptional = prop.isOptional();

    let description: string | undefined;
    let defaultValue: string | undefined;

    // Try to extract JSDoc from valueDeclaration first, then fall back to
    // any declaration the symbol has (handles Pick<>, Omit<>, intersection types
    // where the property originates from another type).
    const declsToCheck = valueDecl ? [valueDecl] : prop.getDeclarations();

    for (const decl of declsToCheck) {
      if (description !== undefined) break;
      if (!("getJsDocs" in decl)) continue;

      const jsDocs = (
        decl as unknown as {
          getJsDocs: () => Array<{
            getDescription: () => string;
            getTags: () => Array<{
              getTagName: () => string;
              getCommentText: () => string | undefined;
            }>;
          }>;
        }
      ).getJsDocs();
      if (jsDocs.length > 0) {
        const doc = jsDocs[0];
        description = doc.getDescription().trim() || undefined;
        const defaultTag = doc
          .getTags()
          .find((t) => t.getTagName() === "default");
        if (defaultTag) {
          defaultValue = defaultTag.getCommentText()?.trim();
        }
      }
    }

    return {
      name,
      type: typeText,
      required: !isOptional,
      ...(defaultValue !== undefined && { defaultValue }),
      ...(description !== undefined && { description }),
    };
  });

  // Sort: required first, then alphabetical
  props.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return props;
}
