import ModalForm from "./modal-form";

export default function Preview() {
  return <ModalForm onSave={(data) => console.log("Saved:", data)} />;
}
