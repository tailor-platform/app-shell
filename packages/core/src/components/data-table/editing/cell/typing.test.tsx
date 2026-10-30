import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { StrictMode } from "react";
import {
  Harness,
  LINES,
  column,
  noop,
  receivedColumn,
  renderTable,
  retype,
  skuColumn,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const errorText = (input: HTMLElement) =>
  document.getElementById(input.getAttribute("aria-describedby") ?? "")?.textContent;

describe("DataTable inline editing", () => {
  describe("keyboard", () => {
    it("notifies once on Enter without moving focus or notifying again on Tab", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <StrictMode>
          <Harness
            columns={(update) => [
              receivedColumn(onValueCommitted, update, { canEdit: (row) => row.id !== "2" }),
            ]}
          />
        </StrictMode>,
      );
      const [first, third] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, first, "20{Enter}");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 20);
      expect(document.activeElement).toBe(first);
      expect((first as HTMLInputElement).value).toBe("20");
      expect(first.getAttribute("enterkeyhint")).toBe("done");
      await user.keyboard("{Enter}");
      await user.tab();
      expect(document.activeElement).toBe(third);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
    });

    it("confirms on Shift+Enter without moving focus", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const inputs = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, inputs[2], "11");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith("3", 11);
      expect(document.activeElement).toBe(inputs[2]);
    });

    it("moves to the next editable cell on Tab, skipping read-only columns", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(onValueCommitted, update),
            skuColumn,
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: { onValueCommitted: (row, value) => update(row.id, { note: value }) },
            }),
          ]}
        />,
      );
      const received = screen.getAllByRole("textbox", { name: "Received" });
      const notes = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, received[0], "18");
      await user.tab();
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 18);
      expect(document.activeElement).toBe(notes[0]);
      await user.tab();
      expect(document.activeElement).toBe(received[1]);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(notes[0]);
    });

    it("reverts the draft on Escape without notifying", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "7{Escape}");
      expect((input as HTMLInputElement).value).toBe("12");
      await user.tab();
      expect(onValueCommitted).not.toHaveBeenCalled();
    });

    it("selects the whole value when a cell receives focus", () => {
      renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" }) as HTMLInputElement[];
      act(() => input.focus());
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length]);
    });

    it("ignores Enter while an IME is composing and parses full-width digits", () => {
      const onValueCommitted = vi.fn();
      renderTable(<Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      act(() => input.focus());
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: "１５" } });
      fireEvent.keyDown(input, { key: "Enter", isComposing: true });
      expect(onValueCommitted).not.toHaveBeenCalled();
      fireEvent.compositionEnd(input);
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onValueCommitted).toHaveBeenCalledWith("1", 15);
      expect(document.activeElement).toBe(input);
    });
  });

  describe("parsing", () => {
    it("accepts negative and fractional numbers independently of display precision", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              typeOptions: { maxDecimals: 0 },
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
                  update(row.id, { received: value });
                },
              },
            }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "-3.5678{Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith("1", -3.5678);
      expect((input as HTMLInputElement).value).toBe("-3.5678");
      expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("does not restrict money input to the currency's display precision", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "price",
              label: "Price",
              type: "money",
              typeOptions: { currency: (row) => row.currency },
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
                  update(row.id, { price: value ?? 0 });
                },
              },
            }),
          ]}
        />,
      );
      const [usd, jpy] = screen.getAllByRole("textbox", { name: "Price" });
      await retype(user, usd, "9.999{Enter}");
      await retype(user, jpy, "12.5{Enter}");
      expect(onValueCommitted.mock.calls).toEqual([
        ["1", 9.999],
        ["2", 12.5],
      ]);
    });

    it("reads full-width digits and thousands separators on confirmation", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [first, second] = screen.getAllByRole("textbox", { name: "Received" });
      await user.click(first);
      await user.clear(first);
      await user.paste("1,234.50");
      await user.keyboard("{Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith("1", 1234.5);
      await retype(user, second, "１５００{Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith("2", 1500);
    });

    it("flags malformed numbers only on confirmation and holds Enter and Tab", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "abc");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      await user.keyboard("{Enter}");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(errorText(input)).toBe("Enter a number. Press Esc to undo");
      expect(document.activeElement).toBe(input);
      await user.tab();
      expect(document.activeElement).toBe(input);
      expect(onValueCommitted).not.toHaveBeenCalled();
      await user.keyboard("{Escape}");
      expect((input as HTMLInputElement).value).toBe("12");
      expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("clears the parsing error after the malformed number is corrected", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "-{Enter}");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      await user.keyboard("3");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      await user.keyboard("{Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith("1", -3);
    });

    it("discards an unparseable draft on blur without changing data", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "1,5{Enter}");
      await user.click(document.body);
      expect(onValueCommitted).not.toHaveBeenCalled();
      expect((input as HTMLInputElement).value).toBe("12");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(input.className).not.toContain("astw:ring-status-attention");
    });

    it("localizes the parsing message", async () => {
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />,
        "ja",
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "abc{Enter}");
      expect(errorText(input)).toBe("数値を入力してください. Escキーで元に戻せます");
    });
  });

  describe("consumer-owned values", () => {
    it("notifies on blur, but never for intermediate keystrokes", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "18");
      expect(onValueCommitted).not.toHaveBeenCalled();
      await user.click(document.body);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 18);
    });

    it("does not notify when numeric formatting alone changes", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "12.00{Enter}");
      await user.click(input);
      await user.keyboard("{Enter}");
      expect(onValueCommitted).not.toHaveBeenCalled();
    });

    it("preserves safe integers when editing and notifies distinct values", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={[{ ...LINES[0], received: 1234567890123456 }]}
          columns={(update) => [receivedColumn(onValueCommitted, update)]}
        />,
      );
      const input = screen.getByRole("textbox", { name: "Received" }) as HTMLInputElement;
      expect(input.value).toBe("1234567890123456");
      await retype(user, input, "1234567890123457{Enter}");
      expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith("1", 1234567890123457);
      expect(input.value).toBe("1234567890123457");
    });

    it("notifies text as typed and empty text or number cells as null", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(onValueCommitted, update),
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
                  update(row.id, { note: value });
                },
              },
            }),
          ]}
        />,
      );
      const [note] = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, note, " Box 2 {Enter}");
      await retype(user, note, "{Enter}");
      const [received] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, received, "{Enter}");
      expect(onValueCommitted.mock.calls).toEqual([
        ["1", " Box 2 "],
        ["1", null],
        ["1", null],
      ]);
    });

    it("lets the consumer reject a change without retaining it or blocking movement", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
                  if (value !== null && value > row.ordered) return;
                  update(row.id, { received: value });
                },
              },
            }),
          ]}
        />,
      );
      const [first, second] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, first, "99{Tab}");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 99);
      expect((first as HTMLInputElement).value).toBe("12");
      expect(first.getAttribute("aria-invalid")).toBeNull();
      expect(document.activeElement).toBe(second);
      await retype(user, first, "98");
      await user.click(document.body);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 98);
      expect((first as HTMLInputElement).value).toBe("12");
    });

    it("shows the consumer's normalized value instead of keeping the submitted draft", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(value);
                  update(row.id, { note: value?.normalize("NFKC").trim() ?? null });
                },
              },
            }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, input, " ＡＢＣ {Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith(" ＡＢＣ ");
      expect((input as HTMLInputElement).value).toBe("ABC");
      expect(input.closest("td")?.textContent).toContain("ABC");
    });

    it("retains a pending draft without adopting it or blocking focus movement", async () => {
      let finish = noop;
      const onValueCommitted = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
      const user = renderTable(
        <Harness
          columns={() => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              edit: { onValueCommitted },
            }),
          ]}
        />,
      );
      const [first, second] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, first, "20{Enter}");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect((first as HTMLInputElement).value).toBe("20");
      expect(document.activeElement).toBe(first);
      await user.tab();
      expect(document.activeElement).toBe(second);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect((first as HTMLInputElement).value).toBe("20");
      await act(async () => finish());
      expect((first as HTMLInputElement).value).toBe("12");
    });

    it("preserves a previous field update when another field changes immediately", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update),
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: { onValueCommitted: (row, value) => update(row.id, { note: value }) },
            }),
          ]}
        />,
      );
      const [received] = screen.getAllByRole("textbox", { name: "Received" });
      const [note] = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, received, "18{Tab}");
      await user.clear(note);
      await user.keyboard("Updated{Tab}");
      expect((received as HTMLInputElement).value).toBe("18");
      expect((note as HTMLInputElement).value).toBe("Updated");
    });
  });
});
