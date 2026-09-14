import { redirectTo, type AppShellPageProps } from "@tailor-platform/app-shell";

const HomePage = () => null;

HomePage.appShellPageProps = {
  meta: { title: "Home" },
  guards: [() => redirectTo("/procurement/purchase-order")],
} satisfies AppShellPageProps;

export default HomePage;
