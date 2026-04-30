import { AppShellOutlet } from "@/components/content";

export type ContentOnlyLayoutProps = {
  /**
   * Custom content renderer.
   *
   * @example
   * ```tsx
   * <ContentOnlyLayout>
   *   {({ Outlet }) => (
   *     <>
   *       <CustomHeader />
   *       <Outlet />
   *       <CustomFooter />
   *     </>
   *   )}
   * </ContentOnlyLayout>
   * ```
   */
  children?: (props: { Outlet: () => React.ReactNode }) => React.ReactNode;
};

export const ContentOnlyLayout = (props: ContentOnlyLayoutProps) => {
  const Children = props.children ? props.children({ Outlet: AppShellOutlet }) : null;
  return (
    <div className="astw:flex astw:flex-col astw:min-h-svh astw:px-6">
      {Children ?? <AppShellOutlet />}
    </div>
  );
};
