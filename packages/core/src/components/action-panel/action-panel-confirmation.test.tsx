import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShellConfigContext, buildConfigurations } from "../../contexts/appshell-context";
import { ActionPanel } from "./action-panel";

type Action = ComponentProps<typeof ActionPanel>["actions"][number];

const makeAction = (overrides: Partial<Action> = {}): Action => ({
  key: "delete",
  label: "Delete order",
  icon: <span>icon</span>,
  onClick: vi.fn(),
  variant: "destructive",
  confirmation: {
    title: "Delete order ORD-123?",
    description: "This removes the order and cannot be undone.",
  },
  ...overrides,
});

const panel = (action: Action | undefined, locale = "en") => (
  <AppShellConfigContext.Provider
    value={{ configurations: buildConfigurations({ modules: [], locale }) }}
  >
    <ActionPanel title="Actions" actions={action ? [action] : []} />
  </AppShellConfigContext.Provider>
);

const deferred = () => {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const openConfirmation = async (user: ReturnType<typeof userEvent.setup>) => {
  const trigger = screen.getByRole("button", { name: "Delete order" });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Delete order ORD-123?" });
  return { trigger, dialog };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ActionPanel confirmation", () => {
  it("opens without executing, uses the action label and destructive variant, and focuses cancel", async () => {
    const user = userEvent.setup();
    const action = makeAction();
    render(panel(action));

    const { dialog } = await openConfirmation(user);
    expect(action.onClick).not.toHaveBeenCalled();
    expect(within(dialog).getByText("This removes the order and cannot be undone.")).toBeDefined();
    const confirm = within(dialog).getByRole("button", { name: "Delete order" });
    expect(confirm.className).toContain("astw:bg-danger-solid");
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
    expect(dialog.outerHTML).toMatchSnapshot();
  });

  it.each(["cancel", "close", "escape", "backdrop"] as const)(
    "dismisses via %s without executing and returns focus to the row",
    async (dismissal) => {
      const user = userEvent.setup();
      const action = makeAction();
      render(panel(action));
      const { trigger, dialog } = await openConfirmation(user);

      if (dismissal === "escape") {
        await user.keyboard("{Escape}");
      } else if (dismissal === "backdrop") {
        // happy-dom does not read focus options; simulate preventScroll support used by Base UI.
        const focus = HTMLElement.prototype.focus;
        vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(
          function (this: HTMLElement, options) {
            void options?.preventScroll;
            focus.call(this, options);
          },
        );
        const backdrop = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
        expect(backdrop).not.toBeNull();
        await user.click(backdrop!);
      } else {
        await user.click(
          within(dialog).getByRole("button", { name: dismissal === "cancel" ? "Cancel" : "Close" }),
        );
      }

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(action.onClick).not.toHaveBeenCalled();
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    },
  );

  it.each(["sync", "async"] as const)(
    "executes a %s callback only after confirmation and closes on success",
    async (mode) => {
      const user = userEvent.setup();
      const onClick = vi.fn(() => (mode === "async" ? Promise.resolve() : undefined));
      render(panel(makeAction({ onClick })));
      const { dialog } = await openConfirmation(user);

      await user.click(within(dialog).getByRole("button", { name: "Delete order" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(onClick).toHaveBeenCalledTimes(1);
    },
  );

  it("supports custom labels and the non-destructive variant", async () => {
    const user = userEvent.setup();
    const operation = deferred();
    const action = makeAction({
      variant: "default",
      onClick: () => operation.promise,
      confirmation: {
        title: "Delete order ORD-123?",
        description: (
          <>
            Review <strong>ORD-123</strong> before continuing.
          </>
        ),
        confirmLabel: "Remove this order",
        cancelLabel: "Keep order",
        busyLabel: "Removing…",
      },
    });
    render(panel(action));
    const { dialog } = await openConfirmation(user);
    const confirm = within(dialog).getByRole("button", { name: "Remove this order" });
    expect(confirm.className).toContain("astw:bg-primary");
    expect(within(dialog).getByRole("button", { name: "Keep order" })).toBeDefined();

    await user.click(confirm);
    expect(within(dialog).getByRole("button", { name: "Removing…" })).toHaveProperty(
      "disabled",
      true,
    );
    await act(async () => operation.resolve());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("prevents same-event duplicate execution and blocks every dismissal while pending", async () => {
    const user = userEvent.setup();
    const operation = deferred();
    const onClick = vi.fn(() => operation.promise);
    render(panel(makeAction({ onClick })));
    const { trigger, dialog } = await openConfirmation(user);
    const confirm = within(dialog).getByRole("button", { name: "Delete order" });

    await act(async () => {
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveProperty("disabled", true);
    expect(trigger.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByTestId("action-panel-spinner")).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Working..." })).toHaveProperty(
      "disabled",
      true,
    );
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const close = within(dialog).getByRole("button", { name: "Close" });
    expect(cancel).toHaveProperty("disabled", true);
    expect(close).toHaveProperty("disabled", true);
    await user.click(cancel);
    await user.click(close);
    await user.keyboard("{Escape}");
    const backdrop = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    expect(screen.getByRole("dialog")).toBe(dialog);

    await act(async () => operation.resolve());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveProperty("disabled", false);
  });

  it("prevents same-event duplicate execution when the callback throws synchronously", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn(() => {
      throw new Error("Try again");
    });
    render(panel(makeAction({ onClick })));
    const { dialog } = await openConfirmation(user);
    const confirm = within(dialog).getByRole("button", { name: "Delete order" });

    await act(async () => {
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByRole("alert").textContent).toBe("Try again");

    await user.click(confirm);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it.each(["throw", "reject"] as const)(
    "keeps a %s failure open, announces it, and clears it when retrying",
    async (failure) => {
      const user = userEvent.setup();
      const retry = deferred();
      const onClick = vi
        .fn()
        .mockImplementationOnce(() => {
          const error = new Error("The order is locked.");
          if (failure === "throw") throw error;
          return Promise.reject(error);
        })
        .mockImplementationOnce(() => retry.promise);
      render(panel(makeAction({ onClick })));
      const { dialog } = await openConfirmation(user);

      await user.click(within(dialog).getByRole("button", { name: "Delete order" }));
      const error = await within(dialog).findByRole("alert");
      expect(error.textContent).toBe("The order is locked.");
      const confirm = within(dialog).getByRole("button", { name: "Delete order" });
      expect(confirm.getAttribute("aria-describedby")).toBe(error.id);
      expect(confirm).toHaveProperty("disabled", false);

      await user.click(confirm);
      expect(within(dialog).queryByRole("alert")).toBeNull();
      expect(onClick).toHaveBeenCalledTimes(2);
      await act(async () => retry.resolve());
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    },
  );

  it.each([
    ["en", "Cancel", "Working...", "The action could not be completed."],
    ["ja", "キャンセル", "処理中…", "操作を完了できませんでした。"],
    ["fr", "Cancel", "Working...", "The action could not be completed."],
  ])(
    "localizes default labels and unknown failures for %s",
    async (locale, cancelLabel, busyLabel, errorMessage) => {
      const user = userEvent.setup();
      const operation = deferred();
      render(panel(makeAction({ onClick: () => operation.promise }), locale));
      const { dialog } = await openConfirmation(user);
      expect(within(dialog).getByRole("button", { name: cancelLabel })).toBeDefined();

      await user.click(within(dialog).getByRole("button", { name: "Delete order" }));
      expect(within(dialog).getByRole("button", { name: busyLabel })).toHaveProperty(
        "disabled",
        true,
      );
      await act(async () => operation.reject({ internal: "Do not display this object" }));
      expect((await within(dialog).findByRole("alert")).textContent).toBe(errorMessage);
    },
  );

  it("clears a previous error when dismissed and reopened", async () => {
    const user = userEvent.setup();
    render(
      panel(
        makeAction({
          onClick: () => {
            throw new Error("Failed");
          },
        }),
      ),
    );
    const { dialog } = await openConfirmation(user);
    await user.click(within(dialog).getByRole("button", { name: "Delete order" }));
    expect(await within(dialog).findByRole("alert")).toBeDefined();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const reopened = await openConfirmation(user);
    expect(within(reopened.dialog).queryByRole("alert")).toBeNull();
  });

  it.each(["disabled", "loading", "removed", "confirmation", "onClick"] as const)(
    "invalidates an unexecuted confirmation when %s changes, without resurrection",
    async (change) => {
      const user = userEvent.setup();
      const action = makeAction();
      const { rerender } = render(panel(action));
      await openConfirmation(user);

      const invalidAction =
        change === "removed"
          ? undefined
          : {
              ...action,
              ...(change === "disabled" ? { disabled: true } : {}),
              ...(change === "loading" ? { loading: true } : {}),
              ...(change === "confirmation" ? { confirmation: undefined } : {}),
              ...(change === "onClick" ? { onClick: undefined } : {}),
            };
      rerender(panel(invalidAction));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      rerender(panel(action));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(action.onClick).not.toHaveBeenCalled();
    },
  );

  it.each(["confirmation", "onClick"] as const)(
    "keeps the row pending when %s is removed during execution",
    async (removed) => {
      const user = userEvent.setup();
      const operation = deferred();
      const onClick = vi.fn(() => operation.promise);
      const action = makeAction({ onClick });
      const { rerender } = render(panel(action));
      const { dialog } = await openConfirmation(user);
      await user.click(within(dialog).getByRole("button", { name: "Delete order" }));

      rerender(panel({ ...action, [removed]: undefined }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      const row = screen.getByRole("button", { name: "Delete order" });
      expect(row).toHaveProperty("disabled", true);
      expect(row.getAttribute("aria-busy")).toBe("true");
      await user.click(row);
      expect(onClick).toHaveBeenCalledTimes(1);

      rerender(panel(action));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByRole("button", { name: "Delete order" })).toHaveProperty("disabled", true);
      await act(async () => operation.resolve());
      expect(screen.getByRole("button", { name: "Delete order" })).toHaveProperty(
        "disabled",
        false,
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    },
  );

  it("does not infer success from an external loading transition", async () => {
    const user = userEvent.setup();
    const operation = deferred();
    const action = makeAction({ onClick: () => operation.promise });
    const { rerender } = render(panel(action));
    const { dialog } = await openConfirmation(user);
    await user.click(within(dialog).getByRole("button", { name: "Delete order" }));

    rerender(panel({ ...action, loading: true }));
    expect(screen.getByRole("dialog")).toBe(dialog);
    rerender(panel({ ...action, loading: false }));
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("button", { name: "Working..." })).toHaveProperty(
      "disabled",
      true,
    );

    await act(async () => operation.resolve());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps a failure open when external loading has not settled yet", async () => {
    const user = userEvent.setup();
    const operation = deferred();
    const action = makeAction({ onClick: () => operation.promise });
    const { rerender } = render(panel(action));
    const { dialog } = await openConfirmation(user);
    await user.click(within(dialog).getByRole("button", { name: "Delete order" }));
    rerender(panel({ ...action, loading: true }));

    await act(async () => operation.reject(new Error("Try again")));
    expect((await within(dialog).findByRole("alert")).textContent).toBe("Try again");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBe(dialog);

    rerender(panel({ ...action, loading: false }));
    expect(within(dialog).getByRole("button", { name: "Delete order" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(within(dialog).getByRole("alert").textContent).toBe("Try again");
  });

  it.each(["resolve", "reject"] as const)(
    "ignores an old action's %s after rekeying while a new confirmation is open",
    async (settlement) => {
      const user = userEvent.setup();
      const operation = deferred();
      const action = makeAction({ onClick: () => operation.promise });
      const { rerender } = render(panel(action));
      const { dialog } = await openConfirmation(user);
      await user.click(within(dialog).getByRole("button", { name: "Delete order" }));

      const nextAction = makeAction({ key: "delete-next-record" });
      rerender(panel(nextAction));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      const next = await openConfirmation(user);
      await act(async () => {
        if (settlement === "resolve") operation.resolve();
        else operation.reject(new Error("Old failure"));
      });
      expect(screen.getByRole("dialog")).toBe(next.dialog);
      expect(within(next.dialog).queryByRole("alert")).toBeNull();
      expect(nextAction.onClick).not.toHaveBeenCalled();
    },
  );

  it.each([{ disabled: true }, { loading: true }])(
    "does not open or execute an unavailable confirmed action (%j)",
    async (unavailable) => {
      const user = userEvent.setup();
      const action = makeAction(unavailable);
      render(panel(action));
      await user.click(screen.getByRole("button", { name: "Delete order" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(action.onClick).not.toHaveBeenCalled();
    },
  );

  it("executes the latest callback after an ordinary rerender without resetting the confirmation", async () => {
    const user = userEvent.setup();
    const action = makeAction();
    const nextOnClick = vi.fn();
    const { rerender } = render(panel(action));
    const { dialog } = await openConfirmation(user);
    rerender(panel({ ...action, onClick: nextOnClick }));
    expect(screen.getByRole("dialog")).toBe(dialog);
    await user.click(within(dialog).getByRole("button", { name: "Delete order" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(action.onClick).not.toHaveBeenCalled();
    expect(nextOnClick).toHaveBeenCalledTimes(1);
  });

  it("does not open an executable-looking dialog without an onClick handler", async () => {
    const user = userEvent.setup();
    render(panel(makeAction({ onClick: undefined })));
    await user.click(screen.getByRole("button", { name: "Delete order" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
