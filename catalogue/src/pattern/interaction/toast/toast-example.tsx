/* pattern: interaction/toast */
import { Button, useToast } from "@tailor-platform/app-shell";

type Props = {
  orderId: string;
  onApprove: () => Promise<void>;
};

export default function ToastExample({ orderId, onApprove }: Props) {
  const toast = useToast();

  const handleApprove = async () => {
    try {
      await onApprove();
      toast.success(`Order ${orderId} approved`);
    } catch {
      toast.error("Failed to approve order. Try again.");
    }
  };

  return <Button onClick={handleApprove}>Approve</Button>;
}
