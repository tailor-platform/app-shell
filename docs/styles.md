# Styles

Styling is done using Tailwind v4. AppShell exports a theme.css file which includes Tailor's preferred color palette and CSS variables.

To configure in your AppShell application, in your global.css or top-level tailwind css file, include this theme.css

Example:

```css
@import "@tailor-platform/app-shell/theme.css"; /* <-- Include this line */
@import "tailwindcss";
```

After including this, your Application's Tailwind will apply the custom colors to to the utility classes.

E.g.

```tsx
<div className="text-muted-foreground bg-muted">...</div>
```

Note, many of these are default Tailwind colors, but there are some differences. If you omit this, much of the UI will look the same, but we will lose some of the Tailor-preferred colors.

## A note on AppShell component class names

AppShell components use Tailwind utility classes for their styling. Tailwind classes are generated at build-time, so stylesheet for AppShell components is already built and is separate to the Tailwind stylesheet generated for your application.

In CSS, the order of style-definition affects the final styles which are computed for an element. Tailwind takes this into account when generating its stylesheet, however because it does not know that there's already a Tailwind-generated stylesheet included in the browser (AppShell's styles), there would be incorrect ordering of style definitions, and clashes can (though do not always) occur.

To avoid this situation, and to ensure correct style resolution, AppShell components use a class prefix "astw" (AppShell TailWind) to avoid clashes. 

This is important to note for developing in AppShell.