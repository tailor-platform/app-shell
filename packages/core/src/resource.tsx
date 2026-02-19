import { ReactNode } from "react";
import { capitalCase } from "change-case";
import { DefaultErrorBoundary } from "./components/default-error-boundary";
import {
  useAppShellConfig,
  type ContextData,
} from "./contexts/appshell-context";
import { buildLocaleResolver, type LocalizedString } from "./lib/i18n";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";

// ============================================
// Context Data (module scope)
// ============================================

let _contextData: ContextData = {} as ContextData;

/**
 * Set the context data. Called internally by AppShell on mount.
 * @internal
 */
export const setContextData = (data: ContextData) => {
  _contextData = data;
};

// ============================================
// Guard Types and Helpers
// ============================================

/**
 * Context provided to guard functions
 */
export type GuardContext = {
  params: Params;
  searchParams: URLSearchParams;
  signal: AbortSignal;
  context: ContextData;
};

/**
 * Result of guard evaluation.
 * Guards can only return one of these constrained result types.
 */
export type GuardResult =
  /** Allow access and render the component */
  | { type: "pass" }
  /** Deny access and show 404 */
  | { type: "hidden" }
  /** Redirect to another path */
  | { type: "redirect"; to: string };

/**
 * Guard function type.
 * Guards are executed in order and stop on the first non-pass result.
 */
export type Guard = (ctx: GuardContext) => Promise<GuardResult> | GuardResult;

/**
 * Allow access to the route. Continue to next guard or render component.
 *
 * @example
 * ```tsx
 * const myGuard: Guard = ({ context }) => {
 *   if (context.currentUser) {
 *     return pass();
 *   }
 *   return hidden();
 * };
 * ```
 */
export const pass = (): GuardResult => ({ type: "pass" });

/**
 * Deny access and show 404 Not Found.
 *
 * @example
 * ```tsx
 * const adminOnly: Guard = ({ context }) => {
 *   if (context.currentUser.role !== "admin") {
 *     return hidden();
 *   }
 *   return pass();
 * };
 * ```
 */
export const hidden = (): GuardResult => ({ type: "hidden" });

/**
 * Redirect to another path.
 *
 * @param to - Path to redirect to
 *
 * @example
 * ```tsx
 * const requireAuth: Guard = ({ context }) => {
 *   if (!context.currentUser) {
 *     return redirectTo("/login");
 *   }
 *   return pass();
 * };
 * ```
 */
export const redirectTo = (to: string): GuardResult => ({
  type: "redirect",
  to,
});

/**
 * Error boundary element type for route error handling.
 *
 * Pass a JSX element that will render when an error occurs.
 * Use the `useRouteError` hook from react-router to access the error.
 *
 * @example
 * ```tsx
 * import { useRouteError } from "@tailor-platform/app-shell";
 *
 * const MyErrorBoundary = () => {
 *   const error = useRouteError() as Error;
 *   return <div>Error: {error.message}</div>;
 * };
 *
 * // In config:
 * errorBoundary: <MyErrorBoundary />
 * // Or with props:
 * errorBoundary: <MyErrorBoundary theme="dark" onReport={handleReport} />
 * ```
 */
export type ErrorBoundaryComponent = ReactNode;

/**
 * Creates a Not Found error response
 *
 * Used to indicate a 404 Not Found error in access control or loaders.
 * Returns a new Response instance each time to avoid "body stream already read" errors.
 */
export const createNotFoundError = () =>
  new Response("Not Found", { status: 404 });

/**
 * Run guards for a resource with given loader args.
 *
 * Guards are executed in order. If any guard returns non-pass result,
 * execution stops and that result is returned.
 */
export const runGuards = async (
  guards: Guard[] | undefined,
  args: LoaderFunctionArgs,
): Promise<GuardResult> => {
  if (!guards || guards.length === 0) return { type: "pass" };

  const url = new URL(args.request.url);
  const ctx: GuardContext = {
    params: args.params,
    searchParams: url.searchParams,
    signal: args.request.signal,
    context: _contextData,
  };

  for (const guard of guards) {
    const result = await guard(ctx);
    if (result.type !== "pass") {
      return result;
    }
  }

  return { type: "pass" };
};

/**
 * Wrap a loader with guards check.
 *
 * If guards deny access, throws createNotFoundError or redirects.
 * Otherwise, runs the base loader if provided.
 */
const withGuardsLoader = (
  guards: Guard[] | undefined,
  baseLoader?: LoaderHandler,
) => {
  return async (args: LoaderFunctionArgs) => {
    const result = await runGuards(guards, args);
    switch (result.type) {
      case "hidden":
        throw createNotFoundError();
      case "redirect":
        return redirect(result.to);
      case "pass":
        return baseLoader ? baseLoader(args) : null;
    }
  };
};

type CommonPageResource = {
  path: string;
  type: "component";
  meta: {
    title: LocalizedString;
    icon?: ReactNode;
  };
};

export type LoaderHandler = (
  args: LoaderFunctionArgs,
) => Promise<unknown> | unknown;

/**
 * A resource that can be included in the root-level content in the navigation.
 */
export type Module = Omit<CommonPageResource, "meta"> & {
  _type: "module";
  component?: () => ReactNode;
  meta: CommonPageResource["meta"] & {
    icon?: ReactNode;
    menuItemClickable: boolean;
  };
  resources: Array<Resource>;
  errorBoundary: ErrorBoundaryComponent;
  guards?: Guard[];
  loader?: LoaderHandler;
};

/**
 * A resource that can be included in the sub-content in the root resource.
 *
 * This resource does not have `category` metadata.
 */
export type Resource = CommonPageResource & {
  _type: "resource";
  component: () => ReactNode;
  subResources?: Array<Resource>;
  errorBoundary: ErrorBoundaryComponent;
  guards?: Guard[];
  loader?: LoaderHandler;
};

export type Modules = Array<Module>;

type PageMeta = {
  /**
   * Title of the page used in navigation.
   *
   * If not provided, the title will be generated from the path.
   */
  title?: LocalizedString;

  icon?: ReactNode;

  /**
   * Custom breadcrumb segment title for this page. Can be a string or a function.
   */
  breadcrumbTitle?: string | ((segment: string) => string);
};

type CommonProps = {
  /**
   * Path of the resource.
   *
   * The path will be used to generate the URL for the resource.
   * This also supports dynamic parameters using the syntax `:paramName`.
   */
  path: string;

  /**
   * Metadata for the page.
   */
  meta?: PageMeta;

  /**
   * Guards to control access to this module/resource.
   * Guards are executed in order. If any guard returns non-pass result,
   * access is denied.
   *
   * @example
   * ```tsx
   * guards: [
   *   ({ context }) => context.currentUser ? pass() : redirectTo("/login"),
   *   ({ context }) => context.currentUser.role === "admin" ? pass() : hidden(),
   * ]
   * ```
   */
  guards?: Guard[];
};

export type ResourceComponentProps = {
  title: string;
  icon?: ReactNode;
  resources?: Array<Resource>;
};

type ReactResourceProps = {
  /**
   * React component to render.
   */
  component: (props: ResourceComponentProps) => ReactNode;
};

/**
 * Create a component that has resolved props by AppShell configurations.
 */
const makeComponent = (
  props: {
    metaTitle: LocalizedString;
    fallbackTitle: string;
  },
  render: (title: string) => ReactNode,
) => {
  return () => {
    const { configurations } = useAppShellConfig();
    const { metaTitle, fallbackTitle } = props;
    const resolve = buildLocaleResolver(configurations.locale);
    const title = resolve(metaTitle, fallbackTitle);
    return render(title);
  };
};

type CommonModuleProps = {
  /**
   * Resource associated to the module.
   */
  resources: Array<Resource>;
  meta: CommonProps["meta"] & {
    icon?: ReactNode;
  };
};

type DefineModuleProps = CommonProps &
  CommonModuleProps & {
    /**
     * React component to render.
     * If not provided, the module will redirect to the first resource.
     *
     * @example
     * ```tsx
     * component: (props) => <div>{props.title}</div>
     * ```
     */
    component?: (props: ResourceComponentProps) => ReactNode;
    /**
     * Error boundary component for this module and its child resources.
     * When an error occurs in this module or its resources, this component will render.
     * Use the `useRouteError` hook to access error details within the component.
     */
    errorBoundary?: ErrorBoundaryComponent;
  };

/**
 * Define a root-level resource that renders a React component.
 *
 * @example
 * ```
 * // Define a minimal resource
 * defineReactResource({
 *   path: "custom-page",
 *   component: () => {
 *     return (
 *       <div>
 *         <p>This is a custom page.</p>
 *       </div>
 *     );
 *   },
 * });
 * ```
 */
export function defineModule(props: DefineModuleProps): Module {
  const { path, meta, component, resources, errorBoundary, guards } = props;
  const metaTitle: LocalizedString = meta?.title ?? capitalCase(path);
  const fallbackTitle = capitalCase(path);

  const loader =
    guards && guards.length > 0 ? withGuardsLoader(guards) : undefined;

  // Build component only if provided
  const wrappedComponent = component
    ? makeComponent({ metaTitle, fallbackTitle }, (title) =>
        component({ title, resources }),
      )
    : undefined;

  return {
    path,
    type: "component" as const,
    _type: "module" as const,
    component: wrappedComponent,
    loader,
    meta: {
      title: metaTitle,
      ...(meta?.breadcrumbTitle !== undefined
        ? { breadcrumbTitle: meta.breadcrumbTitle }
        : {}),
      ...meta,
      menuItemClickable: component !== undefined,
      icon: props.meta?.icon,
    },
    resources,
    errorBoundary: errorBoundary || <DefaultErrorBoundary />,
    guards,
  };
}

type DefineResourceProps = CommonProps &
  ReactResourceProps & {
    /**
     * Sub-resources of the resource.
     */
    subResources?: Array<Resource>;
    /**
     * Error boundary component for this resource and its sub-resources.
     * When an error occurs in this resource, this component will render.
     * Overrides module-level or global error boundaries.
     * Use the `useRouteError` hook to access error details within the component.
     */
    errorBoundary?: ErrorBoundaryComponent;
  };

/**
 * Define a resource that renders a React component.
 *
 * This resource can be used as a sub-resource of a module or as a root-level resource.
 *
 * @example
 * ```
 * // Define a minimal resource
 * defineResource({
 *   path: "custom-page",
 *   component: () => {
 *     return (
 *       <div>
 *         <p>This is a custom page.</p>
 *       </div>
 *     );
 *   },
 *   subResources: [
 *     defineResource({
 *       path: "sub-page",
 *       component: () => {
 *         return (
 *           <div>
 *             <p>This is a sub page.</p>
 *           </div>
 *         );
 *       },
 *     }),
 *   ]
 * });
 * ```
 *
 */
export function defineResource(props: DefineResourceProps): Resource {
  const { path, component, subResources, meta, errorBoundary, guards } = props;
  const metaTitle: LocalizedString = meta?.title ?? capitalCase(path);
  const fallbackTitle = capitalCase(path);
  const loader =
    guards && guards.length > 0 ? withGuardsLoader(guards) : undefined;

  return {
    _type: "resource" as const,
    type: "component" as const,
    path,
    meta: {
      title: metaTitle,
      icon: meta?.icon,
      ...(meta?.breadcrumbTitle !== undefined
        ? { breadcrumbTitle: meta.breadcrumbTitle }
        : {}),
    },
    component: makeComponent({ metaTitle, fallbackTitle }, (title) =>
      component({ title, resources: subResources }),
    ),
    subResources,
    errorBoundary: errorBoundary ?? <DefaultErrorBoundary />,
    guards,
    loader,
  };
}
