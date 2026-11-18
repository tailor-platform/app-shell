import { Text, useAppShellConfig } from "@tailor-platform/app-shell";

export function AppInfo() {
  const { title, configurations } = useAppShellConfig();
  return (
    <div>
      <Text.h2>{title}</Text.h2>
      <Text.p>Base: {configurations.basePath || "/"}</Text.p>
    </div>
  );
}

export function ModuleList() {
  const { configurations } = useAppShellConfig();
  return (
    <ul className="list-inside list-disc">
      {configurations.modules.map((module) => (
        <li key={module.path}>{module.path || "/"}</li>
      ))}
    </ul>
  );
}
