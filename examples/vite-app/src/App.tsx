import {
  AppShell,
  CommandPalette,
  DefaultSidebar,
  SidebarLayout,
} from "@tailor-platform/app-shell";

const App = () => {
  return (
    <AppShell title="File-Based Routing Demo">
      <>
        <SidebarLayout sidebar={<DefaultSidebar />} />
        <CommandPalette />
      </>
    </AppShell>
  );
};

export default App;
