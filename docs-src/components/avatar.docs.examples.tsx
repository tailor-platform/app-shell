import { Avatar } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Avatar.Root>
      <Avatar.Image src="/user.png" alt="Jane Doe" />
      <Avatar.Fallback>JD</Avatar.Fallback>
    </Avatar.Root>
  );
}

export function Sizes() {
  return (
    <div className="flex items-center gap-3">
      <Avatar.Root size="xs">
        <Avatar.Fallback>A</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root size="sm">
        <Avatar.Fallback>AB</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root size="default">
        <Avatar.Fallback>CD</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root size="lg">
        <Avatar.Fallback>EF</Avatar.Fallback>
      </Avatar.Root>
    </div>
  );
}
