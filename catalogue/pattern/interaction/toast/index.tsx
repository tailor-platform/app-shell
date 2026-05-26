import ToastExample from "./toast-example";

export default function Preview() {
  return <ToastExample orderId="ORD-1234" onApprove={() => Promise.resolve()} />;
}
