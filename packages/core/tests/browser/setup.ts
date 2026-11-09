import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import "./consumer.css";

const html = document.documentElement;
let originalClass: string;
let originalStyle: string;

beforeEach(() => {
  originalClass = html.className;
  originalStyle = html.style.cssText;
});

afterEach(() => {
  cleanup();
  document.querySelectorAll("link[data-test-palette]").forEach((link) => link.remove());
  html.className = originalClass;
  html.style.cssText = originalStyle;
});
