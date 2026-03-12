---
title: Introduction
description: AppShell is an opinionated React application framework for creating applications on Tailor Platform with built-in authentication, routing, and beautiful UI components.
---

# Introduction

> **AppShell gives you everything you need to build production-ready ERP applications on Tailor Platform with minimal configuration.**

## What is AppShell?

AppShell is a React-based framework that provides the foundation for building custom ERP applications on Tailor Platform. It handles the complex infrastructure so you can focus on building business-level screens and features.

### Key Features

#### 🚀 Module-based Routing

Define routes through modules and resources instead of file-based routing. Get automatic sidebar navigation and breadcrumbs out of the box.

→ [Learn about Modules & Resources](./concepts/modules-and-resources.md)

#### 🔒 Built-in Authentication

OAuth2/OIDC integration with Tailor Platform's Auth service. Supports any configured IdP including Google, Okta, and Auth0.

→ [Authentication Guide](./concepts/authentication.md)

#### 🎨 Beautiful UI Components

Responsive layouts, description cards, command palette, and more. Built with Tailwind CSS v4 and shadcn/ui principles.

→ [Component Library](./components/app-shell.md)

#### 🔌 ERP Module Integration

Connect compatible ERP modules like PIM, SO, MO with automatic data provider to Tailor's application gateway.

→ [Installation Guide](./installation.md)

## Out of the Box

When you integrate AppShell into your React application, you get:

- ✅ **Simple composition** - Compose custom Tailor-powered, React-based ERP applications with minimal code
- ✅ **User authentication** - Complete OAuth2 flow with token management and session persistence
- ✅ **Authorization** - Route guards for permission-based and role-based access control
- ✅ **Module system** - Organize your app with modules and resources that auto-generate navigation
- ✅ **Beautiful layouts** - Responsive, opinionated layouts with sidebar navigation and breadcrumbs
- ✅ **Convenience hooks** - Access application, module, and user contexts with React hooks
- ✅ **Data integration** - Automatic data provider to Tailor's application gateway

## Requirements

Before you start, make sure you have:

- **React 19+** (React 18+ is supported but React 19 is recommended)
- **Node 16 or higher**
- Basic knowledge of React and JavaScript/TypeScript

## Quick Example

Here's a minimal AppShell application:

```tsx
// App.tsx
import { AppShell, SidebarLayout, defineModule } from "@tailor-platform/app-shell";

const dashboardModule = defineModule({
  path: "dashboard",
  component: () => <h1>Welcome to AppShell!</h1>,
  meta: {
    title: "Dashboard",
  },
  resources: [],
});

const App = () => {
  return (
    <AppShell title="My ERP App" basePath="app" modules={[dashboardModule]}>
      <SidebarLayout />
    </AppShell>
  );
};

export default App;
```

```css
/* globals.css */
@import "@tailor-platform/app-shell/theme.css";
@import "tailwindcss";
```

That's it! AppShell will:

- ✅ Render your module in the sidebar navigation
- ✅ Handle routing to `/app/dashboard`
- ✅ Display breadcrumb navigation
- ✅ Apply Tailor's design system

## Next Steps

**Get Started**

- [Quick Start](./quickstart.md) - Get up and running with AppShell in under 5 minutes
- [Installation](./installation.md) - Detailed installation guide with peer dependencies and configuration

**Learn Core Concepts**

- [Modules & Resources](./concepts/modules-and-resources.md) - Understand the module system
- [Authentication](./concepts/authentication.md) - Set up user authentication
- [Routing & Navigation](./concepts/routing-navigation.md) - Navigate between pages

**Explore Components**

- [AppShell Component](./components/app-shell.md) - Root component API
- [Component Library](./components/sidebar-layout.md) - All available components

## Architecture

AppShell is built on top of:

- **React 19** - Modern React with concurrent features
- **React Router v7** - Client-side routing
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - High-quality component primitives
- **@tailor-platform/auth-public-client** - Authentication SDK

## Project Structure

```
@tailor-platform/app-shell
├── Core library - Components, hooks, layouts, authentication
└── @tailor-platform/app-shell-vite-plugin
    └── Vite plugin for file-based routing (optional)
```

## Version

Current version: **0.27.2**

## License

MIT License - See [LICENSE.md](../LICENSE.md)

## Support

- GitHub Issues: [github.com/tailor-platform/app-shell](https://github.com/tailor-platform/app-shell)
- Documentation: You're reading it!
