import { Button } from "@tailor-platform/app-shell";

export function ColorTokensExample() {
  return (
    <>
      <div className="bg-surface-1 text-fg-default">Token-backed surface</div>
      <Button variant="destructive">Delete</Button>
      <div style={{ background: "#fff", color: "#111" }}>Raw colors bypass the theme</div>
    </>
  );
}
