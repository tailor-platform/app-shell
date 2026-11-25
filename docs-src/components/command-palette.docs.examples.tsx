import { Button, useOpenCommandPalette } from "@tailor-platform/app-shell";

export function OpeningProgrammatically() {
  const openCommandPalette = useOpenCommandPalette();

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => openCommandPalette()}>Search docs</Button>
      <Button variant="outline" onClick={() => openCommandPalette({ search: "Select" })}>
        Find Select docs
      </Button>
    </div>
  );
}
