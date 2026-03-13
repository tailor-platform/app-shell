# Button

Button component with multiple variants and sizes. Supports polymorphic rendering via `render` prop.

## Props

| Prop      | Type                                                                          | Default     | Description                                    |
| --------- | ----------------------------------------------------------------------------- | ----------- | ---------------------------------------------- |
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | Visual style                                   |
| `size`    | `"default" \| "sm" \| "lg" \| "icon"`                                         | `"default"` | Button size                                    |
| `render`  | `React.ReactElement`                                                          | —           | Render as a different element (e.g., `<Link>`) |

## Example

```tsx
import { Button } from "@tailor-platform/app-shell";
import { Link } from "react-router";

<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="sm">Small Outline</Button>
<Button render={<Link to="/page" />}>Navigate</Button>
```
