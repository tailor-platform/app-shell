import { Button, useToast } from "@tailor-platform/app-shell";

export function InteractionToast() {
  const toast = useToast();
  return <Button onClick={() => toast.success("Order ORD-1024 approved")}>Approve</Button>;
}
