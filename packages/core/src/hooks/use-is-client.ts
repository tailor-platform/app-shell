import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Hook to detect if the code is running on the client side.
 *
 * This hook uses `useSyncExternalStore` to safely detect client-side rendering
 * in a way that is compatible with React Server Components (RSC) and SSR.
 *
 * During SSR/RSC, this hook returns `false`. After hydration on the client,
 * it returns `true`.
 *
 * @returns `true` if running on the client, `false` during SSR/RSC
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isClient = useIsClient();
 *
 *   if (!isClient) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <div>Client-side content</div>;
 * }
 * ```
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot
  );
}
