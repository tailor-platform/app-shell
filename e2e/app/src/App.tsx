import { LocalAuthDemoApp } from "./LocalAuthDemoApp";
import { RealAuthDemoApp } from "./RealAuthDemoApp";

export const App = () => {
  const isLocalAuthDemoPath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/local-auth");

  return isLocalAuthDemoPath ? <LocalAuthDemoApp /> : <RealAuthDemoApp />;
};
