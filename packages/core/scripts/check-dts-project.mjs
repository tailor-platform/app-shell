import { join } from "node:path";

/** Each project gets its own Program so module augmentations cannot leak between fixtures. */
export const checkProject = (ts, directory, packageName) => {
  const result = { ours: [], foreign: [], unexpected: [] };
  const configPath = join(directory, "tsconfig.json");
  const { config: source, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error) {
    result.unexpected.push(error);
    return result;
  }
  const config = ts.parseJsonConfigFileContent(
    source,
    ts.sys,
    directory,
    { noEmit: true },
    configPath,
  );
  result.unexpected.push(...config.errors);
  if (result.unexpected.length > 0) return result;

  const program = ts.createProgram({
    rootNames: config.fileNames,
    options: config.options,
    projectReferences: config.projectReferences,
    host: {
      ...ts.createCompilerHost(config.options),
      getCurrentDirectory: () => directory,
    },
  });

  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    const file = diagnostic.file?.fileName.replaceAll("\\", "/");
    if (!file) result.unexpected.push(diagnostic);
    else if (file.includes(`/node_modules/${packageName}/`) || !file.includes("/node_modules/")) {
      result.ours.push(diagnostic);
    } else result.foreign.push(diagnostic);
  }
  return result;
};
