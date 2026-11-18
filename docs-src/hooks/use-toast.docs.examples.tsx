import { Button, useToast } from "@tailor-platform/app-shell";

export function BasicToast() {
  const toast = useToast();
  return (
    <Button onClick={() => toast("Saved", { description: "Your changes have been saved." })}>
      Show saved notification
    </Button>
  );
}

export function CustomDuration() {
  const toast = useToast();
  return (
    <Button onClick={() => toast("Processing...", { duration: 5000 })}>
      Show a five-second toast
    </Button>
  );
}
