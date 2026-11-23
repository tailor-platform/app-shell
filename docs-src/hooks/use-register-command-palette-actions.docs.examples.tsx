import { useState } from "react";
import {
  Button,
  Text,
  useOpenCommandPalette,
  useRegisterCommandPaletteActions,
} from "@tailor-platform/app-shell";

export function ContextualActions() {
  const [count, setCount] = useState(0);
  const [increment, setIncrement] = useState(1);
  const openCommandPalette = useOpenCommandPalette();

  useRegisterCommandPaletteActions("Documentation demo", [
    {
      key: "increase-preview-count",
      label: "Increase preview count",
      onSelect: () => setCount((value) => value + increment),
    },
  ]);

  return (
    <div className="flex flex-col gap-3">
      <Text.p role="status">Preview count: {count}</Text.p>
      <Text.p>Current increment: {increment}</Text.p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openCommandPalette({ search: "Increase preview count" })}>
          Open demo action
        </Button>
        <Button
          variant="outline"
          aria-pressed={increment === 5}
          onClick={() => setIncrement((value) => (value === 1 ? 5 : 1))}
        >
          Add five at a time
        </Button>
      </div>
    </div>
  );
}
