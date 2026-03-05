import {
  defineResource,
  useParams,
  hidden,
  pass,
  type Guard,
} from "@tailor-platform/app-shell";
import type { SVGProps } from "react";
import { useT, labels } from "./i18n-labels";

// ============================================================================
// Sub-page Resources
// ============================================================================

export const dynamicPageResource = defineResource({
  path: ":id",
  meta: {
    title: labels.t("dynamicPageTitle"),
  },
  component: () => {
    const params = useParams<{ id: string }>();
    const t = useT();

    return (
      <div>
        <p>{t("dynamicPageDescription", { id: params.id! })}</p>
      </div>
    );
  },
});

export const subSubPageResource = defineResource({
  path: "sub1-1",
  meta: {
    title: labels.t("subSubPageTitle"),
  },
  subResources: [dynamicPageResource],
  component: () => {
    const t = useT();

    return (
      <div>
        <p>{t("subSubPageDescription")}</p>
      </div>
    );
  },
});

export const subPageResource = defineResource({
  path: "sub1",
  meta: {
    title: labels.t("subPageTitle"),
  },
  subResources: [subSubPageResource],
  component: () => {
    const t = useT();

    return (
      <div>
        <p>{t("subPageDescription")}</p>
      </div>
    );
  },
});

export const hiddenResource = defineResource({
  path: "hidden",
  meta: {
    title: "Hidden Page",
  },
  guards: [() => hidden()],
  component: () => {
    return (
      <div>
        <p>This page should be hidden from navigation.</p>
      </div>
    );
  },
});

// ============================================================================
// Admin Only Restricted Resource
// ============================================================================

const adminOnlyGuard: Guard = ({ context }) => {
  if (context.role !== "admin") {
    return hidden();
  }
  return pass();
};

const ShieldIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
};

export const adminOnlyResource = defineResource({
  path: "admin-only",
  meta: {
    title: "Admin Only",
    icon: <ShieldIcon />,
  },
  guards: [adminOnlyGuard],
  component: () => {
    return (
      <div style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <ShieldIcon
            style={{
              width: "24px",
              height: "24px",
              color: "hsl(var(--primary))",
            }}
          />
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            Admin Only Page
          </h1>
        </div>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "hsl(var(--muted))",
            borderRadius: "0.5rem",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <p style={{ marginBottom: "0.75rem" }}>
            🎉 <strong>Congratulations!</strong> You have admin access.
          </p>
          <p style={{ marginBottom: "0.75rem" }}>
            This page is only visible when you select <strong>"Admin"</strong>{" "}
            role from the sidebar.
          </p>
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.875rem",
            }}
          >
            Try switching to "Staff" role - this page will disappear from the
            navigation and become inaccessible.
          </p>
        </div>
        <div style={{ marginTop: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            How it works:
          </h2>
          <ul
            style={{
              listStyle: "disc",
              paddingLeft: "1.5rem",
              lineHeight: "1.75",
            }}
          >
            <li>
              The{" "}
              <code
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                }}
              >
                RoleSwitcherContext
              </code>{" "}
              manages the current role state
            </li>
            <li>
              The role is passed to AppShell via{" "}
              <code
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                }}
              >
                contextData
              </code>{" "}
              prop
            </li>
            <li>
              A route guard checks{" "}
              <code
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                }}
              >
                context.role
              </code>{" "}
              and returns{" "}
              <code
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                }}
              >
                hidden()
              </code>{" "}
              for non-admins
            </li>
            <li>
              The navigation automatically hides resources that are guarded
            </li>
          </ul>
        </div>
      </div>
    );
  },
});
