import { useState } from "react";
import {
  Layout,
  Input,
  Button,
  Dialog,
  Tabs,
  type AppShellPageProps,
  Card,
} from "@tailor-platform/app-shell";
import { labels } from "../../i18n-labels";

const SettingsIcon = () => (
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
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SettingsPage = () => {
  const [name, setName] = useState("My Application");
  const [email, setEmail] = useState("admin@example.com");

  return (
    <Layout>
      <Layout.Header title="Settings" />
      <Layout.Column>
        <p className="text-muted-foreground">
          This page is at{" "}
          <code className="bg-muted px-2 py-0.5 rounded">src/pages/settings/page.tsx</code>
        </p>
        <Card.Root>
          <Card.Content>
            <Tabs.Root defaultValue="general">
              <Tabs.List>
                <Tabs.Tab value="general">General</Tabs.Tab>
                <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
                <Tabs.Tab value="account">Account</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="general">
                <div className="flex flex-col gap-4 max-w-md mt-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="app-name" className="text-sm font-medium">
                      Application Name
                    </label>
                    <Input id="app-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="admin-email" className="text-sm font-medium">
                      Admin Email
                    </label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Dialog.Root>
                      <Dialog.Trigger render={<Button />}>Save Changes</Dialog.Trigger>
                      <Dialog.Content>
                        <Dialog.Header>
                          <Dialog.Title>Confirm Changes</Dialog.Title>
                          <Dialog.Description>
                            Save &quot;{name}&quot; as the application name and &quot;
                            {email}&quot; as the admin email?
                          </Dialog.Description>
                        </Dialog.Header>
                        <Dialog.Footer>
                          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
                          <Dialog.Close render={<Button />}>Confirm</Dialog.Close>
                        </Dialog.Footer>
                      </Dialog.Content>
                    </Dialog.Root>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setName("My Application");
                        setEmail("admin@example.com");
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </Tabs.Panel>
              <Tabs.Panel value="notifications">
                <p className="mt-4 text-muted-foreground">
                  Configure your notification preferences here.
                </p>
              </Tabs.Panel>
              <Tabs.Panel value="account">
                <p className="mt-4 text-muted-foreground">Manage your account settings here.</p>
              </Tabs.Panel>
            </Tabs.Root>
          </Card.Content>
        </Card.Root>
      </Layout.Column>
    </Layout>
  );
};

SettingsPage.appShellPageProps = {
  meta: {
    title: labels.t("navSettings"),
    icon: <SettingsIcon />,
  },
} satisfies AppShellPageProps;

export default SettingsPage;
