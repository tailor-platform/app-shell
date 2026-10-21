import { render } from "@testing-library/react";
import { Alert, Button, Text } from "@tailor-platform/app-shell";
import { beforeEach, describe, expect, it } from "vitest";
import { applyPalette, contrastOn } from "./theme-utils";

const html = document.documentElement;

const palettes = [
  {
    name: "default",
    light: { card: "rgb(255, 255, 255)", text: "rgb(10, 10, 10)", primary: "rgb(23, 23, 23)" },
    dark: { card: "rgb(23, 23, 23)", text: "rgb(250, 250, 250)", primary: "rgb(229, 229, 229)" },
  },
  {
    name: "cream",
    light: { card: "rgb(255, 255, 255)", text: "rgb(16, 18, 43)", primary: "rgb(83, 90, 232)" },
    dark: { card: "rgb(22, 19, 17)", text: "rgb(247, 244, 238)", primary: "rgb(131, 138, 247)" },
  },
  {
    name: "bloom",
    light: { card: "rgb(255, 255, 255)", text: "rgb(16, 18, 43)", primary: "rgb(83, 90, 232)" },
    dark: { card: "rgb(26, 28, 42)", text: "rgb(248, 249, 252)", primary: "rgb(131, 138, 247)" },
  },
] as const;

for (const palette of palettes) {
  describe.each(["light", "dark"] as const)(`${palette.name} / %s`, (mode) => {
    beforeEach(() => applyPalette(palette.name, mode));

    it("applies the published CSS to internal components and consumer utilities", () => {
      const view = render(
        <>
          <Button data-testid="button">Save</Button>
          <Text variant="label-md" data-testid="label">
            Label
          </Text>
          <div className="bg-card text-card-foreground text-label-md" data-testid="consumer">
            Consumer
          </div>
        </>,
      );
      const expected = palette[mode];
      const button = getComputedStyle(view.getByTestId("button"));
      expect(button.backgroundColor).toBe(expected.primary);
      expect(button.height).toBe("36px");
      const consumer = getComputedStyle(view.getByTestId("consumer"));
      expect(consumer.backgroundColor).toBe(expected.card);
      expect(consumer.color).toBe(expected.text);
      for (const id of ["label", "consumer"]) {
        const style = getComputedStyle(view.getByTestId(id));
        expect(style.fontSize).toBe("14px");
        expect(style.lineHeight).toBe("20px");
        expect(style.fontWeight).toBe("500");
      }
    });

    it("preserves the documented heading cascade and consumer modifiers", () => {
      const view = render(
        <>
          <Text variant="heading-md" className="leading-none font-semibold" data-testid="heading">
            Heading
          </Text>
          <Text
            variant="body-md"
            className="leading-none font-semibold tracking-wide"
            render={<div />}
            data-testid="div"
          >
            Body with consumer modifiers
          </Text>
        </>,
      );
      const heading = getComputedStyle(view.getByTestId("heading"));
      expect(heading.fontSize).toBe("18px");
      expect(parseFloat(heading.lineHeight)).toBeCloseTo(palette.name === "default" ? 18 : 21.6);
      expect(parseFloat(heading.letterSpacing) || 0).toBeCloseTo(
        palette.name === "default" ? 0 : -0.54,
      );
      const div = getComputedStyle(view.getByTestId("div"));
      expect(div.lineHeight).toBe("14px");
      expect(div.fontWeight).toBe("600");
      expect(parseFloat(div.letterSpacing)).toBeCloseTo(0.35);
    });

    it.each(["info", "success", "warning", "error"] as const)(
      "keeps %s Alert text readable on a card",
      (variant) => {
        const view = render(
          <div className="bg-card" data-testid="card">
            <Alert.Root variant={variant} data-testid="alert">
              <Alert.Title>Status</Alert.Title>
              <Alert.Description data-testid="description">Details</Alert.Description>
            </Alert.Root>
          </div>,
        );
        const card = getComputedStyle(view.getByTestId("card"));
        const alert = getComputedStyle(view.getByTestId("alert"));
        const description = getComputedStyle(view.getByTestId("description"));
        expect(
          contrastOn(alert.color, alert.backgroundColor, card.backgroundColor),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastOn(description.color, alert.backgroundColor, card.backgroundColor),
        ).toBeGreaterThanOrEqual(4.5);
      },
    );
  });
}

describe.each(["light", "dark"] as const)("consumer overrides / %s", (mode) => {
  beforeEach(() => applyPalette("default", mode));

  it("resolves root token overrides in both prefixed and unprefixed utilities", () => {
    html.style.setProperty("--primary", "rgb(12 34 56)");
    html.style.setProperty("--type-label-md-size", "18px");
    html.style.setProperty("--type-label-md-line-height", "1.5");
    const view = render(
      <>
        <Button data-testid="button">Save</Button>
        <Text variant="label-md" data-testid="label">
          Label
        </Text>
        <div className="bg-primary text-label-md" data-testid="consumer">
          Consumer
        </div>
      </>,
    );
    for (const id of ["button", "consumer"]) {
      expect(getComputedStyle(view.getByTestId(id)).backgroundColor).toBe("rgb(12, 34, 56)");
    }
    for (const id of ["label", "consumer"]) {
      const style = getComputedStyle(view.getByTestId(id));
      expect(style.fontSize).toBe("18px");
      expect(style.lineHeight).toBe("27px");
    }
  });
});

it("resolves deprecated typography overrides at element scope before the new name", () => {
  html.style.setProperty("--type-body-md-size", "18px");
  const view = render(
    <div data-testid="scope">
      <Text data-testid="text">Body</Text>
    </div>,
  );
  const scope = view.getByTestId("scope");
  const text = view.getByTestId("text");
  expect(getComputedStyle(text).fontSize).toBe("18px");
  scope.style.setProperty("--app-shell-type-body-md-size", "22px");
  expect(getComputedStyle(text).fontSize).toBe("22px");
  scope.style.removeProperty("--app-shell-type-body-md-size");
  expect(getComputedStyle(text).fontSize).toBe("18px");
});

it("re-resolves semantic roles in a nested dark wrapper without changing its light sibling", () => {
  const view = render(
    <>
      <Alert.Root variant="error" data-testid="light">
        <Alert.Title>Light</Alert.Title>
      </Alert.Root>
      <div className="dark">
        <Alert.Root variant="error" data-testid="dark">
          <Alert.Title>Dark</Alert.Title>
        </Alert.Root>
      </div>
    </>,
  );
  expect(getComputedStyle(view.getByTestId("light")).color).toBe("rgb(206, 12, 23)");
  expect(getComputedStyle(view.getByTestId("dark")).color).toBe("rgb(255, 144, 131)");
});
