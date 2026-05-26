import DenseScanList from "./dense-scan";
import { mockOrders } from "./mock";

export default function Preview() {
  return <DenseScanList data={{ rows: mockOrders }} onCreateClick={() => {}} />;
}
