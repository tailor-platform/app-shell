import {
  Accordion,
  Tabs,
  Collapsible,
  Button,
} from "@tailor-platform/app-shell";
import { Section, ChevronsUpDownIcon } from "../../../shared";

const AccordionTabsPage = () => {
  return (
    <div
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <Section title="Accordion">
        <Accordion.Root>
          <Accordion.Item value="item-1">
            <Accordion.Trigger>What is AppShell?</Accordion.Trigger>
            <Accordion.Content>
              AppShell is a React-based framework for building ERP applications
              with opinionated layouts, authentication, and module federation.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="item-2">
            <Accordion.Trigger>How do I define a module?</Accordion.Trigger>
            <Accordion.Content>
              Use <code>defineModule()</code> to create top-level navigation
              items and <code>defineResource()</code> to create pages and
              sub-pages within modules.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="item-3">
            <Accordion.Trigger>
              What UI components are available?
            </Accordion.Trigger>
            <Accordion.Content>
              AppShell provides a comprehensive set of UI primitives built on
              Base UI.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </Section>

      <Section title="Tabs">
        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="overview">
            <div className="astw:p-4 astw:text-sm astw:text-muted-foreground">
              This is the Overview tab content.
            </div>
          </Tabs.Content>
          <Tabs.Content value="analytics">
            <div className="astw:p-4 astw:text-sm astw:text-muted-foreground">
              Analytics data would be displayed here.
            </div>
          </Tabs.Content>
          <Tabs.Content value="settings">
            <div className="astw:p-4 astw:text-sm astw:text-muted-foreground">
              Configuration and preferences.
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </Section>

      <Section title="Collapsible">
        <Collapsible.Root>
          <div className="astw:flex astw:items-center astw:justify-between astw:gap-4">
            <h4 className="astw:text-sm astw:font-semibold">3 dependencies</h4>
            <Collapsible.Trigger>
              <Button variant="ghost" size="sm">
                <ChevronsUpDownIcon />
                <span className="astw:sr-only">Toggle</span>
              </Button>
            </Collapsible.Trigger>
          </div>
          <Collapsible.Content>
            <div className="astw:mt-2 astw:flex astw:flex-col astw:gap-2">
              <div className="astw:rounded-md astw:border astw:border-border astw:px-4 astw:py-3 astw:text-sm astw:font-mono">
                @tailor-platform/app-shell
              </div>
              <div className="astw:rounded-md astw:border astw:border-border astw:px-4 astw:py-3 astw:text-sm astw:font-mono">
                @tailor-platform/auth-public-client
              </div>
              <div className="astw:rounded-md astw:border astw:border-border astw:px-4 astw:py-3 astw:text-sm astw:font-mono">
                @base-ui/react
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </Section>
    </div>
  );
};

export default AccordionTabsPage;
