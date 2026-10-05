import { AppearanceSwitcher, useTheme } from "@tailor-platform/app-shell";

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
