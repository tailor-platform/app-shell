import { AppearanceSwitcher, Button, Table, Text, useTheme } from "@tailor-platform/app-shell";
import { Check } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
    </button>
  );
}

export function AppearanceToggle() {
  return <AppearanceSwitcher />;
}

export function TypographyRoles() {
  const rows = [
    {
      role: "heading-lg",
      className: "text-heading-lg",
      en: "Purchase orders",
      ja: "発注管理",
    },
    {
      role: "heading-md",
      className: "text-heading-md",
      en: "Purchase orders by supplier",
      ja: "仕入先別の発注一覧",
    },
    {
      role: "heading-sm",
      className: "text-heading-sm",
      en: "Delivery address",
      ja: "納品先",
    },
    {
      role: "body-md",
      className: "text-body-md",
      en: "The order was sent to the supplier on 12 March.",
      ja: "発注書は3月12日に仕入先へ送付されました。",
    },
    {
      role: "body-sm",
      className: "text-body-sm text-muted-foreground",
      en: "Updated 2 hours ago",
      ja: "2時間前に更新",
    },
    {
      role: "label-md",
      className: "text-label-md",
      en: "Order quantity",
      ja: "発注数量",
    },
    {
      role: "label-sm",
      className: "text-label-sm",
      en: "Draft",
      ja: "下書き",
    },
    {
      role: "code-sm",
      className: "font-mono text-code-sm",
      en: "PO-2026-000184",
      ja: "PO-2026-000184",
    },
    {
      role: "body-md-relaxed",
      className: "text-body-md-relaxed",
      compareWith: { role: "body-md", className: "text-body-md" },
      en: "Please confirm the delivery date with the supplier before you approve this order. If the supplier cannot deliver by the requested date, change the date or choose another supplier. Approved orders are sent to the supplier by email.",
      ja: "この発注を承認する前に、納期を仕入先に確認してください。希望日までに納品できない場合は、納期を変更するか、別の仕入先を選んでください。承認した発注は、メールで仕入先に送られます。",
    },
    {
      role: "body-sm-relaxed",
      className: "text-body-sm-relaxed text-muted-foreground",
      compareWith: { role: "body-sm", className: "text-body-sm text-muted-foreground" },
      en: "Changes to a confirmed order are recorded in the order history. Each record shows who made the change, when it was made, and the values before and after the change.",
      ja: "確定済みの発注への変更は、発注履歴に記録されます。記録には、変更した人、変更した日時、変更前と変更後の値が含まれます。",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {rows.map(({ role, className, compareWith, en, ja }) => (
        <div key={role} className="grid grid-cols-[9rem_1fr] items-baseline gap-4">
          <span className="font-mono text-code-sm text-muted-foreground">{role}</span>
          {compareWith ? (
            // A relaxed role changes only line height, so show the same text in the base role first.
            <div className="flex flex-col gap-4">
              {[compareWith, { role, className }].map((variant) => (
                <div key={variant.role} className="flex flex-col gap-1">
                  <span className="font-mono text-code-sm text-muted-foreground">
                    {variant.role}
                  </span>
                  <p className={variant.className}>{en}</p>
                  <p className={variant.className}>{ja}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className={className}>{en}</p>
              <p className={className}>{ja}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SemanticColorRoles() {
  return (
    <Text.span className="rounded-md bg-success-surface px-2 py-0.5 text-success-text">
      Paid
    </Text.span>
  );
}

export function WarningSurface() {
  return (
    <div className="rounded-lg border border-warning-border bg-warning-surface p-4 text-warning-text">
      <Text.p>Review the delivery date before confirming this order.</Text.p>
    </div>
  );
}

export function TextTypography() {
  return (
    <div className="flex flex-col gap-2">
      <Text.h3 variant="heading-md">Line items</Text.h3>
      <Text variant="body-md" className="text-muted-foreground">
        Description copy
      </Text>
      <Text variant="body-sm" className="text-muted-foreground">
        Updated 2h ago
      </Text>
    </div>
  );
}

export function TableHeaderRole() {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <th className="text-label-md text-muted-foreground">Amount</th>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>$1,240.00</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}

export function ReducedMotion() {
  return (
    <Button
      variant="outline"
      className="transition-colors duration-150 ease-out motion-reduce:transition-none"
    >
      Hover or focus to change the surface
    </Button>
  );
}

export function ZIndexToken() {
  return (
    <div className="relative isolate h-40">
      <Text.div className="absolute left-4 top-4 z-(--z-portal) rounded-md border bg-popover p-4 text-popover-foreground shadow-sm">
        Portal token: in front
      </Text.div>
      <Text.div className="absolute left-16 top-12 rounded-md border bg-muted p-4 text-muted-foreground">
        Later sibling: behind
      </Text.div>
    </div>
  );
}

export function IconSizing() {
  return (
    <div className="flex items-center gap-2">
      <Check className="size-4" aria-hidden="true" />
      <Text.span>Confirmed</Text.span>
    </div>
  );
}
