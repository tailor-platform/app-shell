import { useState } from "react";
import {
  Layout,
  Input,
  Button,
  Dialog,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";

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
        <p className="astw:mb-6 astw:text-muted-foreground">
          This page is at{" "}
          <code className="astw:bg-muted astw:px-2 astw:py-0.5 astw:rounded">
            src/pages/settings/page.tsx
          </code>
        </p>
        <div className="astw:flex astw:flex-col astw:gap-4 astw:max-w-md">
          <div className="astw:flex astw:flex-col astw:gap-1.5">
            <label className="astw:text-sm astw:font-medium">
              Application Name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="astw:flex astw:flex-col astw:gap-1.5">
            <label className="astw:text-sm astw:font-medium">Admin Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="astw:flex astw:gap-2 astw:mt-2">
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
                  <Dialog.Close render={<Button variant="outline" />}>
                    Cancel
                  </Dialog.Close>
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
      </Layout.Column>
    </Layout>
  );
};

SettingsPage.appShellPageProps = {
  meta: {
    title: "Settings",
    icon: <SettingsIcon />,
  },
} satisfies AppShellPageProps;

export default SettingsPage;
