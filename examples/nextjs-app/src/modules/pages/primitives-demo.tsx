import {
  defineResource,
  Layout,
  Card,
  Button,
  Input,
  Badge,
  Tooltip,
  Dialog,
  Sheet,
  Menu,
  Table,
  Tabs,
  Alert,
  AlertTitle,
  AlertDescription,
} from "@tailor-platform/app-shell";
import {
  LayoutDashboard as LayoutDashboardIcon,
  FolderKanban as FolderKanbanIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import * as React from "react";

export const primitiveComponentsDemoResource = defineResource({
  path: "primitives-demo",
  meta: {
    title: "Primitive Components Demo",
  },
  component: () => {
    const [inputValue, setInputValue] = React.useState("");
    const [showToolbar, setShowToolbar] = React.useState(true);
    const [showSidebar, setShowSidebar] = React.useState(false);
    const [sortOrder, setSortOrder] = React.useState("date");

    const labelStyle: React.CSSProperties = {
      fontSize: "0.875rem",
      color: "var(--muted-foreground)",
      marginBottom: "0.5rem",
    };
    const rowStyle: React.CSSProperties = {
      display: "flex",
      gap: "0.5rem",
      flexWrap: "wrap",
    };

    return (
      <Layout>
        <Layout.Header title="Primitive Components" />
        <Layout.Column>
          {/* Button variants */}
          <Card.Root>
            <Card.Header title="Button" />
            <Card.Content>
              <div style={{ display: "flex", gap: "2rem" }}>
                <div>
                  <div style={labelStyle}>Variant</div>
                  <div style={rowStyle}>
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Size</div>
                  <div style={{ ...rowStyle, alignItems: "center" }}>
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button disabled>Disabled</Button>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card.Root>

          {/* Input */}
          <Card.Root>
            <Card.Header title="Input" />
            <Card.Content>
              <div style={rowStyle}>
                <Input
                  style={{ maxWidth: "240px" }}
                  placeholder="Type something..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Input style={{ maxWidth: "240px" }} type="email" placeholder="Email" />
                <Input style={{ maxWidth: "240px" }} disabled placeholder="Disabled" />
              </div>
            </Card.Content>
          </Card.Root>

          {/* Badge */}
          <Card.Root>
            <Card.Header title="Badge" />
            <Card.Content>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <div style={labelStyle}>Solid</div>
                  <div style={rowStyle}>
                    <Badge>Default</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="neutral">Neutral</Badge>
                    <Badge variant="info">Info</Badge>
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Subtle</div>
                  <div style={rowStyle}>
                    <Badge variant="subtle-success">Subtle Success</Badge>
                    <Badge variant="subtle-warning">Subtle Warning</Badge>
                    <Badge variant="subtle-error">Subtle Error</Badge>
                    <Badge variant="subtle-info">Subtle Info</Badge>
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Outline</div>
                  <div style={rowStyle}>
                    <Badge variant="outline-success">Outline Success</Badge>
                    <Badge variant="outline-warning">Outline Warning</Badge>
                    <Badge variant="outline-error">Outline Error</Badge>
                    <Badge variant="outline-info">Outline Info</Badge>
                    <Badge variant="outline-neutral">Outline Neutral</Badge>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card.Root>

          {/* Tooltip */}
          <Card.Root>
            <Card.Header title="Tooltip" />
            <Card.Content>
              <Tooltip.Provider>
                <div style={{ ...rowStyle, gap: "1rem" }}>
                  <Tooltip.Root>
                    <Tooltip.Trigger render={<Button variant="outline" />}>
                      Top (default)
                    </Tooltip.Trigger>
                    <Tooltip.Content position={{ side: "top" }}>Tooltip on top</Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger render={<Button variant="outline" />}>Bottom</Tooltip.Trigger>
                    <Tooltip.Content position={{ side: "bottom" }}>
                      Tooltip on bottom
                    </Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger render={<Button variant="outline" />}>Left</Tooltip.Trigger>
                    <Tooltip.Content position={{ side: "left" }}>Tooltip on left</Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger render={<Button variant="outline" />}>Right</Tooltip.Trigger>
                    <Tooltip.Content position={{ side: "right" }}>Tooltip on right</Tooltip.Content>
                  </Tooltip.Root>
                </div>
              </Tooltip.Provider>
            </Card.Content>
          </Card.Root>

          {/* Dialog */}
          <Card.Root>
            <Card.Header title="Dialog" />
            <Card.Content>
              <Dialog.Root>
                <Dialog.Trigger render={<Button variant="outline" />}>Open Dialog</Dialog.Trigger>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>Dialog Title</Dialog.Title>
                    <Dialog.Description>
                      This is a dialog description. You can put any content here.
                    </Dialog.Description>
                  </Dialog.Header>
                  <Dialog.Footer>
                    <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
                    <Dialog.Close render={<Button />}>Confirm</Dialog.Close>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Root>
            </Card.Content>
          </Card.Root>

          {/* Sheet */}
          <Card.Root>
            <Card.Header title="Sheet" />
            <Card.Content>
              <div style={rowStyle}>
                <Sheet.Root side="right">
                  <Sheet.Trigger render={<Button variant="outline" />}>
                    Open Sheet (Right)
                  </Sheet.Trigger>
                  <Sheet.Content>
                    <Sheet.Header>
                      <Sheet.Title>Sheet Title</Sheet.Title>
                      <Sheet.Description>This sheet slides in from the right.</Sheet.Description>
                    </Sheet.Header>
                    <div style={{ padding: "1rem 0" }}>Sheet content goes here.</div>
                    <Sheet.Footer>
                      <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
                    </Sheet.Footer>
                  </Sheet.Content>
                </Sheet.Root>
                <Sheet.Root side="left">
                  <Sheet.Trigger render={<Button variant="outline" />}>
                    Open Sheet (Left)
                  </Sheet.Trigger>
                  <Sheet.Content>
                    <Sheet.Header>
                      <Sheet.Title>Left Sheet</Sheet.Title>
                      <Sheet.Description>This sheet slides in from the left.</Sheet.Description>
                    </Sheet.Header>
                    <Sheet.Footer>
                      <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
                    </Sheet.Footer>
                  </Sheet.Content>
                </Sheet.Root>
                <Sheet.Root side="bottom">
                  <Sheet.Trigger render={<Button variant="outline" />}>
                    Open Sheet (Bottom)
                  </Sheet.Trigger>
                  <Sheet.Content>
                    <Sheet.Header>
                      <Sheet.Title>Bottom Sheet</Sheet.Title>
                      <Sheet.Description>This sheet slides in from the bottom.</Sheet.Description>
                    </Sheet.Header>
                    <Sheet.Footer>
                      <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
                    </Sheet.Footer>
                  </Sheet.Content>
                </Sheet.Root>
              </div>
            </Card.Content>
          </Card.Root>

          {/* Menu */}
          <Card.Root>
            <Card.Header title="Menu" />
            <Card.Content>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                <div>
                  <div style={labelStyle}>Pattern</div>
                  <div style={rowStyle}>
                    <Menu.Root>
                      <Menu.Trigger render={<Button variant="outline" />}>Basic</Menu.Trigger>
                      <Menu.Content>
                        <Menu.Item onClick={() => alert("Edit clicked")}>Edit</Menu.Item>
                        <Menu.Item onClick={() => alert("Duplicate clicked")}>Duplicate</Menu.Item>
                        <Menu.Item onClick={() => alert("Copy ID clicked")}>Copy ID</Menu.Item>
                        <Menu.Separator />
                        <Menu.Item
                          onClick={() => alert("Delete clicked")}
                          className="astw:text-destructive"
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                    <Menu.Root>
                      <Menu.Trigger render={<Button variant="outline" />}>
                        Checkbox & Radio
                      </Menu.Trigger>
                      <Menu.Content>
                        <Menu.Group>
                          <Menu.GroupLabel>Panels</Menu.GroupLabel>
                          <Menu.CheckboxItem checked={showToolbar} onCheckedChange={setShowToolbar}>
                            <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
                            Show Toolbar
                          </Menu.CheckboxItem>
                          <Menu.CheckboxItem checked={showSidebar} onCheckedChange={setShowSidebar}>
                            <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
                            Show Sidebar
                          </Menu.CheckboxItem>
                        </Menu.Group>
                        <Menu.Separator />
                        <Menu.Group>
                          <Menu.GroupLabel>Sort by</Menu.GroupLabel>
                          <Menu.RadioGroup value={sortOrder} onValueChange={setSortOrder}>
                            <Menu.RadioItem value="date">
                              <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                              Date
                            </Menu.RadioItem>
                            <Menu.RadioItem value="name">
                              <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                              Name
                            </Menu.RadioItem>
                            <Menu.RadioItem value="size">
                              <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
                              Size
                            </Menu.RadioItem>
                          </Menu.RadioGroup>
                        </Menu.Group>
                      </Menu.Content>
                    </Menu.Root>
                    <Menu.Root>
                      <Menu.Trigger render={<Button variant="outline" />}>Submenu</Menu.Trigger>
                      <Menu.Content>
                        <Menu.Group>
                          <Menu.GroupLabel>Document</Menu.GroupLabel>
                          <Menu.Item onClick={() => alert("New")}>New</Menu.Item>
                          <Menu.Item onClick={() => alert("Open")}>Open</Menu.Item>
                          <Menu.Item onClick={() => alert("Save")}>Save</Menu.Item>
                        </Menu.Group>
                        <Menu.Separator />
                        <Menu.SubmenuRoot>
                          <Menu.SubmenuTrigger>Export as →</Menu.SubmenuTrigger>
                          <Menu.Content position={{ side: "right", align: "start" }}>
                            <Menu.Item onClick={() => alert("PDF")}>PDF</Menu.Item>
                            <Menu.Item onClick={() => alert("CSV")}>CSV</Menu.Item>
                            <Menu.Item onClick={() => alert("JSON")}>JSON</Menu.Item>
                          </Menu.Content>
                        </Menu.SubmenuRoot>
                        <Menu.Separator />
                        <Menu.Item disabled>Print (unavailable)</Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Direction</div>
                  <div style={rowStyle}>
                    <Menu.Root>
                      <Menu.Trigger render={<Button variant="outline" />}>Bottom ↓</Menu.Trigger>
                      <Menu.Content position={{ side: "bottom" }}>
                        <Menu.Item>Item 1</Menu.Item>
                        <Menu.Item>Item 2</Menu.Item>
                        <Menu.Item>Item 3</Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                    <Menu.Root>
                      <Menu.Trigger render={<Button variant="outline" />}>Top ↑</Menu.Trigger>
                      <Menu.Content position={{ side: "top" }}>
                        <Menu.Item>Item 1</Menu.Item>
                        <Menu.Item>Item 2</Menu.Item>
                        <Menu.Item>Item 3</Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                    <Menu.Root>
                      <Menu.Trigger render={<Button variant="outline" />}>Right →</Menu.Trigger>
                      <Menu.Content position={{ side: "right" }}>
                        <Menu.Item>Item 1</Menu.Item>
                        <Menu.Item>Item 2</Menu.Item>
                        <Menu.Item>Item 3</Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                    <Menu.Root>
                      <Menu.Trigger render={<Button variant="outline" />}>Left ←</Menu.Trigger>
                      <Menu.Content position={{ side: "left" }}>
                        <Menu.Item>Item 1</Menu.Item>
                        <Menu.Item>Item 2</Menu.Item>
                        <Menu.Item>Item 3</Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card.Root>

          {/* Tabs */}
          <Card.Root>
            <Card.Header title="Tabs" />
            <Card.Content>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}
              >
                <div style={{ display: "flex", gap: "2rem" }}>
                  <div>
                    <div style={labelStyle}>Default</div>
                    <Tabs.Root defaultValue="overview">
                      <Tabs.List>
                        <Tabs.Tab value="overview">Overview</Tabs.Tab>
                        <Tabs.Tab value="projects">Projects</Tabs.Tab>
                        <Tabs.Tab value="settings">Settings</Tabs.Tab>
                      </Tabs.List>
                      <Tabs.Panel value="overview">Overview content</Tabs.Panel>
                      <Tabs.Panel value="projects">Projects content</Tabs.Panel>
                      <Tabs.Panel value="settings">Settings content</Tabs.Panel>
                    </Tabs.Root>
                  </div>
                  <div>
                    <div style={labelStyle}>Line</div>
                    <Tabs.Root defaultValue="activity" variant="line">
                      <Tabs.List>
                        <Tabs.Tab value="activity">Activity</Tabs.Tab>
                        <Tabs.Tab value="members">Members</Tabs.Tab>
                        <Tabs.Tab value="billing">Billing</Tabs.Tab>
                      </Tabs.List>
                      <Tabs.Panel value="activity">Activity content</Tabs.Panel>
                      <Tabs.Panel value="members">Members content</Tabs.Panel>
                      <Tabs.Panel value="billing">Billing content</Tabs.Panel>
                    </Tabs.Root>
                  </div>
                  <div>
                    <div style={labelStyle}>Capsule</div>
                    <Tabs.Root defaultValue="all" variant="capsule">
                      <Tabs.List>
                        <Tabs.Tab value="all">All</Tabs.Tab>
                        <Tabs.Tab value="open">Open</Tabs.Tab>
                        <Tabs.Tab value="received">Received</Tabs.Tab>
                        <Tabs.Tab value="closed">Closed</Tabs.Tab>
                      </Tabs.List>
                      <Tabs.Panel value="all">All content</Tabs.Panel>
                      <Tabs.Panel value="open">Open content</Tabs.Panel>
                      <Tabs.Panel value="received">Received content</Tabs.Panel>
                      <Tabs.Panel value="closed">Closed content</Tabs.Panel>
                    </Tabs.Root>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "2rem" }}>
                  <div>
                    <div style={labelStyle}>With Badge</div>
                    <Tabs.Root defaultValue="overview">
                      <Tabs.List>
                        <Tabs.Tab value="overview">
                          Overview
                          <Badge variant="success" style={{ marginLeft: "0.5rem" }}>
                            New
                          </Badge>
                        </Tabs.Tab>
                        <Tabs.Tab value="projects">
                          Projects
                          <Badge style={{ marginLeft: "0.5rem" }}>10+</Badge>
                        </Tabs.Tab>
                      </Tabs.List>
                      <Tabs.Panel value="overview">Overview content</Tabs.Panel>
                      <Tabs.Panel value="projects">Projects content</Tabs.Panel>
                    </Tabs.Root>
                  </div>
                  <div>
                    <div style={labelStyle}>Icons</div>
                    <Tabs.Root defaultValue="overview" variant="capsule">
                      <Tabs.List>
                        <Tabs.Tab value="overview">
                          <LayoutDashboardIcon size={16} />
                        </Tabs.Tab>
                        <Tabs.Tab value="projects">
                          <FolderKanbanIcon size={16} />
                        </Tabs.Tab>
                        <Tabs.Tab value="settings">
                          <SettingsIcon size={16} />
                        </Tabs.Tab>
                      </Tabs.List>
                      <Tabs.Panel value="overview">Overview content</Tabs.Panel>
                      <Tabs.Panel value="projects">Projects content</Tabs.Panel>
                      <Tabs.Panel value="settings">Settings content</Tabs.Panel>
                    </Tabs.Root>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card.Root>

          {/* Table */}
          <Card.Root>
            <Card.Header title="Table" />
            <Card.Content>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Name</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Role</Table.Head>
                    <Table.Head>Amount</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell>Alice Johnson</Table.Cell>
                    <Table.Cell>
                      <Badge variant="success">Active</Badge>
                    </Table.Cell>
                    <Table.Cell>Admin</Table.Cell>
                    <Table.Cell>$1,200.00</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell>Bob Smith</Table.Cell>
                    <Table.Cell>
                      <Badge variant="neutral">Inactive</Badge>
                    </Table.Cell>
                    <Table.Cell>Editor</Table.Cell>
                    <Table.Cell>$800.00</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell>Carol Lee</Table.Cell>
                    <Table.Cell>
                      <Badge variant="success">Active</Badge>
                    </Table.Cell>
                    <Table.Cell>Viewer</Table.Cell>
                    <Table.Cell>$350.00</Table.Cell>
                  </Table.Row>
                </Table.Body>
                <Table.Footer>
                  <Table.Row>
                    <Table.Cell colSpan={3}>Total</Table.Cell>
                    <Table.Cell>$2,350.00</Table.Cell>
                  </Table.Row>
                </Table.Footer>
              </Table.Root>
            </Card.Content>
          </Card.Root>

          {/* Alert */}
          <Card.Root>
            <Card.Header title="Alert" />
            <Card.Content>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Alert>
                  <AlertTitle>Default Alert</AlertTitle>
                  <AlertDescription>This is a default alert message.</AlertDescription>
                </Alert>
                <Alert variant="success">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>Operation completed successfully.</AlertDescription>
                </Alert>
                <Alert variant="error">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>Something went wrong. Please try again.</AlertDescription>
                </Alert>
                <Alert variant="neutral">
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>This is a neutral informational message.</AlertDescription>
                </Alert>
              </div>
            </Card.Content>
          </Card.Root>
        </Layout.Column>
      </Layout>
    );
  },
});
