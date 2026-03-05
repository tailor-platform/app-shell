import {
  AppShell,
  CommandPalette,
  DefaultSidebar,
  SidebarItem,
  SidebarGroup,
  SidebarLayout,
  SidebarSeparator,
} from "@tailor-platform/app-shell";
import type { SVGProps } from "react";

const ComponentsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z" />
    <path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z" />
    <path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z" />
    <path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z" />
  </svg>
);

const FormIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
  </svg>
);

const LayersIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L21 12" />
    <path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L21 17" />
  </svg>
);

const TableIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 3v18" />
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
  </svg>
);

const App = () => {
  return (
    <AppShell title="Components Showcase">
      <>
        <SidebarLayout
          sidebar={
            <DefaultSidebar>
              <SidebarItem
                to="/"
                title="Home"
                icon={<ComponentsIcon />}
                activeMatch="exact"
              />
              <SidebarSeparator />
              <SidebarGroup title="Components" icon={<ComponentsIcon />}>
                <SidebarItem
                  to="/components/buttons-badges"
                  title="Button & Badge"
                />
                <SidebarItem
                  to="/components/accordion-tabs"
                  title="Accordion & Tabs"
                />
                <SidebarItem to="/components/overlays" title="Overlays" />
                <SidebarItem
                  to="/components/avatar-separator"
                  title="Avatar & Separator"
                />
                <SidebarItem
                  to="/components/progress-meter"
                  title="Progress & Meter"
                />
                <SidebarItem
                  to="/components/toggle-toolbar"
                  title="Toggle & Toolbar"
                />
              </SidebarGroup>
              <SidebarGroup title="Form Controls" icon={<FormIcon />}>
                <SidebarItem to="/forms/fields" title="Field & Fieldset" />
                <SidebarItem to="/forms/select" title="Select" />
                <SidebarItem to="/forms/combobox" title="Combobox" />
                <SidebarItem to="/forms/autocomplete" title="Autocomplete" />
                <SidebarItem
                  to="/forms/switch-slider-radio"
                  title="Switch / Slider / Radio"
                />
              </SidebarGroup>
              <SidebarGroup title="Data Display" icon={<TableIcon />}>
                <SidebarItem to="/data/table" title="Table" />
                <SidebarItem
                  to="/data/description-card"
                  title="DescriptionCard"
                />
              </SidebarGroup>
              <SidebarGroup title="Layout" icon={<LayersIcon />}>
                <SidebarItem to="/layout/columns" title="Layout Columns" />
              </SidebarGroup>
            </DefaultSidebar>
          }
        />
        <CommandPalette />
      </>
    </AppShell>
  );
};

export default App;
