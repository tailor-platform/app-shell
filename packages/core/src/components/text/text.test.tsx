import { Field as BaseField } from "@base-ui/react/field";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Text, type TextProps } from "./text";

afterEach(() => {
  cleanup();
});

type TextVariant = NonNullable<TextProps["variant"]>;

const defaultTheme = readFileSync(join(__dirname, "../../assets/themes/default.css"), "utf8");
// Matches the declared name before and after #606 renames `--app-shell-type-*` to `--type-*`.
const themeRoles = [
  ...new Set(
    [...defaultTheme.matchAll(/^\s*--(?:app-shell-)?type-([a-z-]+)-size:/gm)].map((m) => m[1]),
  ),
];

describe("Text", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for representative roles
  // ==========================================================================

  describe("snapshots", () => {
    it("default role", () => {
      const { container } = render(<Text>Orders sent this month.</Text>);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("heading role", () => {
      const { container } = render(<Text variant="heading-md">Purchase orders</Text>);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("code role", () => {
      const { container } = render(<Text variant="code-sm">PO-0001</Text>);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with render prop", () => {
      const { container } = render(
        // eslint-disable-next-line jsx-a11y/heading-has-content -- Text passes the children to the rendered h3
        <Text variant="heading-md" render={<h3 />}>
          Line items
        </Text>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("has a variant for every role in the default palette", () => {
    for (const role of themeRoles) {
      const { container } = render(<Text variant={role as TextVariant}>x</Text>);
      expect(container.firstElementChild?.className, role).toContain(`astw:text-${role}`);
      cleanup();
    }
  });

  it.each([
    ["heading-lg", "H2"],
    ["heading-md", "H2"],
    ["heading-sm", "H2"],
    ["body-md", "P"],
    ["body-sm", "P"],
    ["body-md-relaxed", "P"],
    ["body-sm-relaxed", "P"],
    ["label-md", "SPAN"],
    ["label-sm", "SPAN"],
    ["code-sm", "SPAN"],
  ] as const)("renders %s as %s by default", (variant, tagName) => {
    const { container } = render(<Text variant={variant}>x</Text>);
    expect(container.firstElementChild?.tagName).toBe(tagName);
  });

  it("renders body-md as a paragraph when no variant is given", () => {
    const { container } = render(<Text>x</Text>);
    const element = container.firstElementChild;
    expect(element?.tagName).toBe("P");
    expect(element?.className).toContain("astw:text-body-md");
  });

  it("treats a null variant as the default role", () => {
    const { container } = render(<Text variant={null}>x</Text>);
    const element = container.firstElementChild;
    expect(element?.tagName).toBe("P");
    expect(element?.className).toContain("astw:text-body-md");
  });

  it("changes the element but keeps the role with the render prop", () => {
    render(
      // eslint-disable-next-line jsx-a11y/heading-has-content -- Text passes the children to the rendered h4
      <Text variant="heading-sm" render={<h4 />}>
        Shipping
      </Text>,
    );
    const heading = screen.getByRole("heading", { level: 4 });
    expect(heading.textContent).toBe("Shipping");
    expect(heading.className).toContain("astw:text-heading-sm");
  });

  it("adds font-mono to code-sm", () => {
    const { container } = render(<Text variant="code-sm">PO-0001</Text>);
    expect(container.firstElementChild?.className).toContain("astw:font-mono");
  });

  it("keeps the role next to color and modifier classes", () => {
    const { container } = render(
      <Text variant="heading-md" className="text-muted-foreground leading-none tabular-nums">
        Total
      </Text>,
    );
    const classes = container.firstElementChild?.className.split(" ");
    expect(classes).toEqual(
      expect.arrayContaining([
        "astw:text-heading-md",
        "text-muted-foreground",
        "leading-none",
        "tabular-nums",
      ]),
    );
  });

  it("sets data-slot and passes other props through", () => {
    render(
      <Text id="total" aria-live="polite">
        x
      </Text>,
    );
    const element = document.getElementById("total");
    expect(element?.getAttribute("data-slot")).toBe("text");
    expect(element?.getAttribute("aria-live")).toBe("polite");
  });

  it("forwards the ref to the rendered element", () => {
    const ref = React.createRef<HTMLElement>();
    render(
      <Text variant="heading-md" ref={ref}>
        x
      </Text>,
    );
    expect(ref.current?.tagName).toBe("H2");
  });

  it("keeps the message a Base UI part supplies when no children are given", async () => {
    render(
      <BaseField.Root validate={() => "Enter a quantity."} validationMode="onBlur">
        <BaseField.Control data-testid="qty" />
        <Text variant="label-md" render={<BaseField.Error />} />
      </BaseField.Root>,
    );
    fireEvent.focus(screen.getByTestId("qty"));
    fireEvent.blur(screen.getByTestId("qty"));
    expect(await screen.findByText("Enter a quantity.")).toBeDefined();
  });
});
