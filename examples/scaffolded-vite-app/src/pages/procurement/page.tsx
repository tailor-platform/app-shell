import { redirectTo, type AppShellPageProps } from "@tailor-platform/app-shell";

const ProcurementPage = () => null;

ProcurementPage.appShellPageProps = {
  meta: { title: "Procurement" },
  guards: [() => redirectTo("/procurement/purchase-order")],
} satisfies AppShellPageProps;

export default ProcurementPage;
