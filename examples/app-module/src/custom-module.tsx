import {
  defineModule,
  Link,
  ResourceComponentProps,
} from "@tailor-platform/app-shell";
import type { SVGProps } from "react";
import { useT, labels } from "./i18n-labels";

import {
  subPageResource,
  hiddenResource,
  adminOnlyResource,
} from "./sub-pages";

const ZapIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 14a1 1 0 0 1-.8-1.6l9-11A1 1 0 0 1 14 2v7h6a1 1 0 0 1 .8 1.6l-9 11A1 1 0 0 1 10 22v-7z" />
    </svg>
  );
};

export const customPageModule = defineModule({
  path: "custom-page",
  component: (pageProps: ResourceComponentProps) => {
    const t = useT();

    return (
      <div>
        <h2 style={{ fontWeight: "bold" }}>{pageProps.title}</h2>
        <div style={{ paddingTop: "1rem" }}>
          <p>
            <Link to="/custom-page/sub1">{t("goToSub1")}</Link>
          </p>
          <p>
            <Link to="/custom-page/sub1/sub1-1">{t("goToSub1-1")}</Link>
          </p>
          <p>
            <Link to="/custom-page/sub1/sub1-1/123">
              {t("goToDynamicPage")}
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/admin-only"
              style={{
                color: "hsl(var(--destructive))",
                textDecoration: "underline",
              }}
            >
              🔒 Admin Only Page (Restricted)
            </Link>
          </p>
        </div>
      </div>
    );
  },
  meta: {
    title: labels.t("customPageTitle"),
    icon: <ZapIcon />,
  },
  resources: [subPageResource, hiddenResource, adminOnlyResource],
});
