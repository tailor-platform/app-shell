import { AppShell, DefaultSidebar, SidebarLayout } from "@tailor-platform/app-shell";

// The docs explorer is a real AppShell app. Routes and the sidebar are inferred
// automatically from the file structure under src/pages/ (file-based routing +
// auto-generation mode) — no `modules` prop, no manual SidebarItems.
const App = () => {
  return (
    <AppShell title="app-shell docs">
      <SidebarLayout sidebar={<DefaultSidebar />} />
    </AppShell>
  );
};

export default App;
