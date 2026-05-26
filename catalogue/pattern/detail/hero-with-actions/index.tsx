import HeroWithActionsDetail from "./hero-with-actions";
import { mockOrder } from "./mock";

export default function Preview() {
  return <HeroWithActionsDetail order={mockOrder} onApprove={() => {}} onCancel={() => {}} />;
}
