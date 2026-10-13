import { Avatar } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Avatar.Root>
      <Avatar.Image src="/user.png" alt="Jane Doe" />
      <Avatar.Fallback>JD</Avatar.Fallback>
    </Avatar.Root>
  );
}
