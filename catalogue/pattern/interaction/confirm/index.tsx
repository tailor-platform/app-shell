import ConfirmDialog from "./confirm";

export default function Preview() {
  return <ConfirmDialog orderId="ORD-1234" onDelete={() => console.log("Deleted")} />;
}
