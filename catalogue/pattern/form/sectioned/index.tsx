import SectionedForm from "./sectioned-form";

export default function Preview() {
  return <SectionedForm onSave={(data) => console.log("Saved:", data)} onCancel={() => {}} />;
}
