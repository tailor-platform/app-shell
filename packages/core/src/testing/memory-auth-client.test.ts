import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthState, EnhancedAuthClient } from "../contexts/auth-context";
import { createMemoryAuthClient } from "./memory-auth-client";

const signedOut: AuthState = { isReady: true, isAuthenticated: false, error: null };
const signedIn: AuthState = { isReady: true, isAuthenticated: true, error: null };
const loading: AuthState = { isReady: false, isAuthenticated: false, error: null };
type AuthEvent = Parameters<Parameters<EnhancedAuthClient["addEventListener"]>[0]>[0];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createMemoryAuthClient", () => {
  it("defaults to a ready, signed-out state and satisfies the production client type", async () => {
    const client: EnhancedAuthClient = createMemoryAuthClient();

    expect(client.getState()).toEqual(signedOut);
    await expect(client.ready()).resolves.toBeUndefined();
    expect(await client.checkAuthStatus()).toBe(client.getState());
  });

  it("copies and freezes snapshots, preserving the reference until a change", () => {
    const initial = { ...signedOut };
    const client = createMemoryAuthClient(initial);
    const original = client.getState();
    const listener = vi.fn();
    client.addEventListener(listener);

    initial.isAuthenticated = true;
    expect(original).toEqual(signedOut);
    expect(Object.isFrozen(original)).toBe(true);
    expect(client.getState()).toBe(original);

    client.setState({ ...signedOut });
    expect(client.getState()).toBe(original);
    expect(listener).not.toHaveBeenCalled();

    const next = { ...signedIn };
    client.setState(next);
    const changed = client.getState();
    next.error = "caller mutation";

    expect(changed).not.toBe(original);
    expect(changed).toEqual(signedIn);
    expect(Object.isFrozen(changed)).toBe(true);
    expect(listener).toHaveBeenCalledWith({ type: "auth_state_changed", data: changed });
  });

  it("replaces error state without synthesizing action events", () => {
    const client = createMemoryAuthClient(signedIn);
    const listener = vi.fn();
    client.addEventListener(listener);
    const failed = { ...signedOut, error: "Session expired" };

    client.setState(failed);

    expect(client.getState()).toEqual(failed);
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      type: "auth_state_changed",
      data: client.getState(),
    });
  });

  it("isolates instances", async () => {
    const first = createMemoryAuthClient();
    const second = createMemoryAuthClient();
    const listener = vi.fn();
    second.addEventListener(listener);

    await first.login();

    expect(first.getState()).toEqual(signedIn);
    expect(second.getState()).toEqual(signedOut);
    expect(listener).not.toHaveBeenCalled();
  });

  it.each(["login", "logout"] as const)(
    "%s publishes settled state before action and state-change notifications",
    async (action) => {
      const client = createMemoryAuthClient({ ...loading, error: "Previous error" });
      const expected = action === "login" ? signedIn : signedOut;
      const observed: Array<{ event: AuthEvent; state: Readonly<AuthState> }> = [];
      client.addEventListener((event) => {
        observed.push({ event, state: client.getState() });
      });
      const ready = client.ready();

      await client[action]();

      await expect(ready).resolves.toBeUndefined();
      expect(client.getState()).toEqual(expected);
      expect(observed.map(({ event }) => event.type)).toEqual([action, "auth_state_changed"]);
      for (const { event, state } of observed) {
        expect(event.data).toBe(client.getState());
        expect(state).toBe(client.getState());
      }
    },
  );

  it.each(["login", "logout"] as const)("repeated %s still emits action events", async (action) => {
    const client = createMemoryAuthClient(action === "login" ? signedIn : signedOut);
    const snapshot = client.getState();
    const listener = vi.fn();
    client.addEventListener(listener);

    await client[action]();
    await client[action]();

    expect(client.getState()).toBe(snapshot);
    expect(listener.mock.calls.map(([event]) => event.type)).toEqual([
      action,
      "auth_state_changed",
      action,
      "auth_state_changed",
    ]);
  });

  it("shares pending readiness and leaves checks loading until an explicit ready state", async () => {
    const client = createMemoryAuthClient(loading);
    const ready = client.ready();
    const onReady = vi.fn();
    const onChecked = vi.fn();
    void ready.then(onReady);
    const check = client.checkAuthStatus().then(onChecked);

    expect(client.ready()).toBe(ready);
    await Promise.resolve();
    expect(onReady).not.toHaveBeenCalled();
    expect(onChecked).not.toHaveBeenCalled();
    expect(client.getState()).toEqual(loading);

    client.setState({ ...loading, error: "Still loading" });
    expect(client.ready()).toBe(ready);
    await Promise.resolve();
    expect(onChecked).not.toHaveBeenCalled();

    client.setState(signedIn);
    await Promise.all([ready, check]);

    expect(onReady).toHaveBeenCalledOnce();
    expect(onChecked).toHaveBeenCalledExactlyOnceWith(client.getState());
  });

  it("starts a new readiness episode when a settled client becomes loading again", async () => {
    const client = createMemoryAuthClient(loading);
    const first = client.ready();
    client.setState(signedOut);
    await first;

    client.setState(loading);
    const second = client.ready();
    const settled = vi.fn();
    void second.then(settled);

    expect(second).not.toBe(first);
    expect(client.ready()).toBe(second);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();

    client.setState(signedIn);
    await second;
    expect(settled).toHaveBeenCalledOnce();
  });

  it("keeps checks pending if readiness restarts before a previous wait resumes", async () => {
    const client = createMemoryAuthClient(loading);
    const checked = vi.fn();
    const check = client.checkAuthStatus().then(checked);

    client.setState(signedOut);
    client.setState(loading);
    await Promise.resolve();
    expect(checked).not.toHaveBeenCalled();

    client.setState(signedIn);
    await check;
    expect(checked).toHaveBeenCalledExactlyOnceWith(client.getState());
  });

  it("unsubscribes registrations independently and idempotently", () => {
    const client = createMemoryAuthClient();
    const listener = vi.fn();
    const removeFirst = client.addEventListener(listener);
    const removeSecond = client.addEventListener(listener);

    removeFirst();
    removeFirst();
    client.setState(signedIn);
    expect(listener).toHaveBeenCalledOnce();

    removeSecond();
    removeSecond();
    client.setState(signedOut);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("dispatches over a snapshot when listeners add or remove subscriptions", () => {
    const client = createMemoryAuthClient();
    const second = vi.fn();
    const third = vi.fn();
    let removeSecond: () => void;
    const removeFirst = client.addEventListener(() => {
      removeSecond();
      client.addEventListener(third);
    });
    removeSecond = client.addEventListener(second);

    client.setState(signedIn);
    expect(second).toHaveBeenCalledOnce();
    expect(third).not.toHaveBeenCalled();

    removeFirst();
    client.setState(signedOut);
    expect(second).toHaveBeenCalledOnce();
    expect(third).toHaveBeenCalledOnce();
  });

  it("keeps each event payload fixed if a listener changes state during notification", () => {
    const client = createMemoryAuthClient();
    const received: AuthEvent[] = [];
    client.addEventListener(() => {
      if (client.getState().isAuthenticated) client.setState(signedOut);
    });
    client.addEventListener((event) => {
      received.push(event);
    });

    client.setState(signedIn);

    expect(received.map(({ data }) => data)).toEqual([signedOut, signedIn]);
    expect(client.getState()).toEqual(signedOut);
  });

  it("isolates listener errors so they do not suppress later notifications", () => {
    const client = createMemoryAuthClient();
    const error = new Error("Application listener failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const listener = vi.fn();
    client.addEventListener(() => {
      throw error;
    });
    client.addEventListener(listener);

    client.setState(signedIn);

    expect(consoleError).toHaveBeenCalledWith("Error in auth event listener:", error);
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      type: "auth_state_changed",
      data: client.getState(),
    });
  });

  it("rejects unsupported auth capabilities without network, URL, or storage effects", async () => {
    const beforeLocation = window.location.href;
    const fetch = vi.spyOn(globalThis, "fetch");
    const localGet = vi.spyOn(window.localStorage, "getItem");
    const localSet = vi.spyOn(window.localStorage, "setItem");
    const sessionGet = vi.spyOn(window.sessionStorage, "getItem");
    const sessionSet = vi.spyOn(window.sessionStorage, "setItem");
    const client = createMemoryAuthClient();
    const operations = [
      ["getAuthUrl", () => client.getAuthUrl()],
      ["handleCallback", () => client.handleCallback()],
      ["refreshTokens", () => client.refreshTokens()],
      ["getAuthHeaders", () => client.getAuthHeaders("/memory-auth")],
      ["fetch", () => client.fetch("/memory-auth")],
    ] as const;

    for (const [method, run] of operations) {
      await expect(run()).rejects.toThrow(`MemoryAuthClient.${method} is not supported`);
    }
    expect(() => client.configure({})).toThrow("MemoryAuthClient.configure is not supported");
    expect(() => client.getAppUri()).toThrow("MemoryAuthClient.getAppUri is not supported");

    await client.login({ returnTo: "/orders" });
    await client.logout();
    await client.checkAuthStatus();
    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.href).toBe(beforeLocation);
    for (const operation of [localGet, localSet, sessionGet, sessionSet]) {
      expect(operation).not.toHaveBeenCalled();
    }
  });
});
