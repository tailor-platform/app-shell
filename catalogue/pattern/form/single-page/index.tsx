import SinglePageForm from "./single-page-form";

export default function Preview() {
  return <SinglePageForm onSave={(data) => console.log("Saved:", data)} onCancel={() => {}} />;
}
