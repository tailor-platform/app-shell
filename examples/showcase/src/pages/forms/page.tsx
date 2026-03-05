import { Link } from "@tailor-platform/app-shell";

const FormsPage = () => (
  <div style={{ padding: "1.5rem" }}>
    <h1
      style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
    >
      Form Controls
    </h1>
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Link
        to="/forms/fields"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Field & Fieldset
      </Link>
      <Link
        to="/forms/select"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Select
      </Link>
      <Link
        to="/forms/combobox"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Combobox
      </Link>
      <Link
        to="/forms/autocomplete"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Autocomplete
      </Link>
      <Link
        to="/forms/switch-slider-radio"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Switch / Slider / Radio
      </Link>
    </div>
  </div>
);

export default FormsPage;
