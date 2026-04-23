import { defineModule, Link, ResourceComponentProps } from "@tailor-platform/app-shell";
import { useT, labels } from "./i18n-labels";
import { ZapIcon } from "./pages/metric-card-demo";
import { actionPanelDemoResource } from "./pages/action-panel-demo";
import { metricCardDemoResource } from "./pages/metric-card-demo";
import { activityCardDemoResource } from "./pages/activity-card-demo";
import {
  purchaseOrderDemoResource,
  subPageResource,
  hiddenResource,
} from "./pages/purchase-order-demo";
import { adminOnlyResource } from "./pages/admin-only";
import {
  oneColumnLayoutResource,
  twoColumnLayoutResource,
  threeColumnLayoutResource,
  layoutSlotsDemoResource,
} from "./pages/layout-demos";
import { primitiveComponentsDemoResource } from "./pages/primitives-demo";
import { dropdownComponentsDemoResource } from "./pages/dropdown-demo";
import { formComponentsDemoResource, zodRHFFormDemoResource } from "./pages/form-demo";
import { csvImporterDemoResource } from "./pages/csv-importer-demo";
import { renderJSONDemoResource } from "./pages/render-json-demo";

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
            <Link to="/custom-page/sub1/sub1-1/123">{t("goToDynamicPage")}</Link>
          </p>
          <p>
            <Link
              to="/custom-page/purchase-order-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View Purchase Order Demo (DescriptionCard)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/action-panel-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View Action Panel Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/metric-card-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View MetricCard Demo (KPI cards)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/activity-card-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View ActivityCard Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/layout-1-column"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View 1 Column Layout Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/layout-2-columns"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View 2 Columns Layout Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/layout-3-columns"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View 3 Columns Layout Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/layout-slots-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              View Layout Slots Demo
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
          <p>
            <Link
              to="/custom-page/primitives-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Primitive Components Demo (Button, Input, Menu, Table, Dialog, Sheet, Tooltip)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/dropdown-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Dropdown Components Demo (Select, Combobox, Autocomplete)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/form-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Form Components Demo (Field, Fieldset, Form)
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/zod-rhf-form-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Zod + React Hook Form Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/csv-importer-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              CSV Importer Demo
            </Link>
          </p>
          <p>
            <Link
              to="/custom-page/render-json-demo"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              RenderJSON Demo
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
  resources: [
    subPageResource,
    hiddenResource,
    adminOnlyResource,
    purchaseOrderDemoResource,
    actionPanelDemoResource,
    metricCardDemoResource,
    activityCardDemoResource,
    oneColumnLayoutResource,
    twoColumnLayoutResource,
    threeColumnLayoutResource,
    layoutSlotsDemoResource,
    primitiveComponentsDemoResource,
    dropdownComponentsDemoResource,
    formComponentsDemoResource,
    zodRHFFormDemoResource,
    csvImporterDemoResource,
    renderJSONDemoResource,
  ],
});
