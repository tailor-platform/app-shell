import MultiSelect from "./multi-select";
import { mockOrders } from "./mock";

export default function Preview() {
  return (
    <MultiSelect
      orders={mockOrders}
      onArchive={(ids) => console.log("Archive:", ids)}
      onExport={(ids) => console.log("Export:", ids)}
    />
  );
}
