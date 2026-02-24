import * as React from "react";

type PropsWithClassName = { className?: string; children?: React.ReactNode };

/**
 * Render either a custom element (via render prop) or a default element.
 * This replaces the asChild pattern with render prop pattern.
 */
export function renderOrDefault<P extends PropsWithClassName>(
  render: React.ReactElement | undefined,
  DefaultComponent: React.ElementType,
  props: P,
  children?: React.ReactNode,
): React.ReactElement {
  if (render) {
    // Get props with proper typing
    const { className: propsClassName, ...restProps } = props;
    const renderElementProps = render.props as PropsWithClassName | undefined;
    const renderClassName = renderElementProps?.className;
    const { className: _, ...renderProps } = renderElementProps ?? {};

    const mergedClassName = [propsClassName, renderClassName]
      .filter(Boolean)
      .join(" ");

    const mergedProps = {
      ...restProps,
      ...renderProps,
      ...(mergedClassName ? { className: mergedClassName } : {}),
    };

    // If children is provided and render element doesn't have children, use the provided children
    const renderChildren = renderElementProps?.children;
    if (children && !renderChildren) {
      return React.cloneElement(render, mergedProps, children);
    }

    return React.cloneElement(render, mergedProps);
  }

  return React.createElement(DefaultComponent, props, children);
}
