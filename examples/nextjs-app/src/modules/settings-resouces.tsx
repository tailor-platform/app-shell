import { defineResource } from "@tailor-platform/app-shell";

export const profileResource = defineResource({
  path: "profile",
  meta: {
    title: "Profile",
  },
  component: () => <div>Here is profile settings</div>,
});
