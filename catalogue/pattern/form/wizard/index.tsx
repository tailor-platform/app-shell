import WizardForm from "./wizard-form";

export default function Preview() {
  return <WizardForm onComplete={() => console.log("Import complete")} />;
}
