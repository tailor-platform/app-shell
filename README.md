# Tailor Platform App Shell

## Overview

AppShell is an opinionated React application framework for creating applications on Tailor Platform.

Out of the box, AppShell gives you:
* A simple way to compose custom Tailor-powered, React-based ERP applications.
* User authentication and authorization.
* Use and connect compatible ERP modules like PIM, SO, MO, etc.
* Responsive, opinionated and beautifully crafted layouts and components
* Convenience hooks for accessing application, module and user contexts
* Automatic data provider to Tailor's application gateway

## Requirements
- React 18+
- Node 16+
- Basic React and JavaScript/TypeScript knowledge

## Quickstart

Install AppShell to your React application:

```bash
npm install @tailor-platform/app-shell
```

Then add the `AppShell` component to the base path you would like to be managed by AppShell

```jsx
const Page = () => {
  const appShellConfig: AppShellProps = {
    title: "AppShell",
    basePath: "dashboard",
    modules: [customPageModule],
  };

  return (
    <AppShell {...appShellConfig}>
      <SidebarLayout />
    </AppShell>
  );
};
```

Mount AppShell's Tailwind theme ([read more on styles](./docs/styles.md))

```css
/* globals.css */
@import "@tailor-platform/app-shell/theme.css";
@import "tailwindcss";
```

To build your application, create your pages as normal React components, then point to these in the AppShell configuration as *modules* and *resources*, which AppShell will manage the routing for automatically ([more on modules and resources](./docs/module-resource-definition.md)).

AppShell will:
 - show these in your Sidebar Layout,
 - manage the routing for these pages based on the paths you set,
 - render the configured component of your Modules and Resources in 
 - show Breadcrumb Trail navigation based on the structure

```tsx
const customPageModule = defineModule({
  path: "my-page",
  component: MyPage,
  meta: {
    title: "My Page",
  },
  resources: [
    defineResource({
      path: "my-sub-page",
      component: MySubPage,
    })
  ],
});
```

You'll now be able to browse to:
 - `localhost:3000/{your-base-route}/dashboard/my-page` *and*
 - `localhost:3000/{your-base-route}/dashboard/my-page/my-sub-page`

For more on the AppShell component's props, and other Components and hooks, see the [API documentation](./docs/api.md)

## Development Commands

This project uses pnpm and is structured as a monorepo with multiple packages. Here are the main commands you'll need:

### Getting Started
```bash
# Install all dependencies across the monorepo
pnpm install
```

### Development
```bash
# Run all packages in development mode with hot reloading
pnpm dev

# Build all packages for production
pnpm build

# Run type checking across all packages
pnpm type-check
```

### Testing
```bash
# Run tests in the core package
cd packages/core && pnpm test
```

### Publishing (Maintainers)
This project uses [changesets](https://github.com/changesets/changesets) for version management and publishing:

```bash
# Create a new changeset when you make changes
pnpm changeset:create

# Build and publish packages to NPM (automated via CI)
pnpm changeset:publish
```

When contributing, create a changeset describing your changes. This will be used to automatically generate changelogs and version bumps.

## Guides and Reference

Next, dive deeper into AppShell by reading more

- Browse the [API](./docs/api.md)
- Understanding [routing and navigation](./docs/routing-and-navigation.md)
- Configuring your application structure through [module and resource definition](./docs/module-resource-definition.md)
- Set up [authentication](./docs/authentication.md)
- Configuring [Styles](./docs/styles.md)
- [Developing AppShell](./docs/development.md)

## Frequently Asked Questions

### Why did you use react-router for routing? And why not next.js file-based navigation?

We find that react-router:

* Enables full portability to any react-based application
* Simplifies module declaration without limiting flexibility
* Federates routing to each module
* Makes it all easy at integration time (2 lines of code)

Finally, there is probably a future where we use the native routing solution for each available react-powered stack.

### Why should I use AppShell?

We've made some sensible default choices for you so that you could focus on what matters most - creating business level screens.

The alternative is that you have to do all ☝️ yourself if you don't. You may want to do this if you'd like to use your own UI library or your don't like the choices we've made for you.

### Where can I use AppShell?

AppShell can be used in any React-based application.
