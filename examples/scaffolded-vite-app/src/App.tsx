import { AppShell, SidebarGroup, SidebarItem, SidebarLayout } from "@tailor-platform/app-shell";

const App = () => {
  return (
    <AppShell title="Scaffolded Vite App">
      <SidebarLayout
        sidebar={
          <SidebarLayout.DefaultSidebar>
            <SidebarGroup title="Procurement">
              <SidebarItem to="/procurement/purchase-order" activeMatch="prefix" />
            </SidebarGroup>
          </SidebarLayout.DefaultSidebar>
        }
      />
    </AppShell>
  );
};

export default App;
