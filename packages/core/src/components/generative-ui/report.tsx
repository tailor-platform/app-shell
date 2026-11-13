import type { AIChatToolSchema } from "../../ai/tools";
import { useResolvedLocale, useTimeZone } from "../../contexts/appshell-context";
import { defineI18nLabels } from "../../hooks/i18n";
import { cn } from "../../lib/utils";
import { Response } from "../ai-chat/response";
import { Alert } from "../alert";
import { Badge, type BadgeProps } from "../badge";
import { Card } from "../card";
import { Table } from "../table";
import { Text } from "../text";
import { reportSchema, type ReportCell, type ReportData, type ReportPart } from "./report-schema";
import type { GenerativeUICardDefinition } from "./types";

const labels = defineI18nLabels({
  en: {
    source: "Source",
    unknownValue: "Unknown",
    previous: (props: { value: string }) => `Previous: ${props.value}`,
    ok: "OK",
    warn: "Warning",
    neutral: "Neutral",
    unknown: "Unknown",
    match: "Match",
    diff: "Different",
    missing: "Missing",
    unverifiable: "Unverifiable",
    pass: "Pass",
    fail: "Fail",
    skip: "Skipped",
    user: "User",
    system: "System",
    external: "External",
  },
  ja: {
    source: "参照元",
    unknownValue: "不明",
    previous: (props: { value: string }) => `以前の値: ${props.value}`,
    ok: "正常",
    warn: "注意",
    neutral: "参考",
    unknown: "不明",
    match: "一致",
    diff: "差異",
    missing: "欠落",
    unverifiable: "確認不可",
    pass: "合格",
    fail: "不合格",
    skip: "未実施",
    user: "ユーザー",
    system: "システム",
    external: "外部",
  },
});

const statusVariants = {
  ok: "subtle-success",
  warn: "subtle-warning",
  neutral: "subtle-neutral",
  unknown: "subtle-neutral",
  match: "subtle-success",
  diff: "subtle-warning",
  missing: "subtle-error",
  unverifiable: "subtle-neutral",
  pass: "subtle-success",
  fail: "subtle-error",
  skip: "subtle-neutral",
} satisfies Record<string, BadgeProps["variant"]>;

const calloutVariants = { info: "info", ok: "success", warn: "warning", error: "error" } as const;

type Display = {
  t: ReturnType<typeof labels.useT>;
  number: (value: number) => string;
  dateTime: (value: string) => string;
};

function Status({ value, display }: { value: keyof typeof statusVariants; display: Display }) {
  return <Badge variant={statusVariants[value]}>{display.t(value)}</Badge>;
}

function Sources({ refs, display }: { refs: readonly string[]; display: Display }) {
  if (!refs.length) return null;
  return (
    <Text.div
      variant="body-sm"
      className="astw:break-words astw:text-muted-foreground"
      data-slot="generative-ui-sources"
    >
      {display.t("source")}: {refs.join(", ")}
    </Text.div>
  );
}

function CellValue({ value, display }: { value: ReportCell | undefined; display: Display }) {
  if (value === undefined || value === null) return <Text.span variant="body-md">—</Text.span>;
  if (typeof value === "number")
    return (
      <Text.span variant="body-md" className="astw:tabular-nums">
        {display.number(value)}
      </Text.span>
    );
  if (typeof value === "string") return <Text.span variant="body-md">{value}</Text.span>;
  return (
    <div className="astw:space-y-1">
      <div className="astw:flex astw:flex-wrap astw:items-center astw:gap-2">
        <CellValue value={value.value} display={display} />
        {value.verdict && <Status value={value.verdict} display={display} />}
        {value.tone && value.tone !== "neutral" && <Status value={value.tone} display={display} />}
      </div>
      {value.sub && (
        <Text.div variant="body-sm" className="astw:text-muted-foreground">
          {value.sub}
        </Text.div>
      )}
    </div>
  );
}

function ReportTable({
  part,
  claim,
  display,
}: {
  part: Extract<ReportPart, { kind: "table" }>;
  claim: string;
  display: Display;
}) {
  const renderCells = (cells: Record<string, ReportCell>) =>
    part.columns.map((column) => {
      const value = cells[column.key];
      const isVerdict =
        column.kind === "verdict" &&
        typeof value === "string" &&
        (value === "match" || value === "diff" || value === "missing" || value === "unverifiable");
      return (
        <Table.Cell
          key={column.key}
          align={column.kind === "number" ? "right" : "left"}
          className="astw:whitespace-normal astw:break-words"
        >
          {isVerdict ? (
            <Status value={value} display={display} />
          ) : (
            <CellValue value={value} display={display} />
          )}
        </Table.Cell>
      );
    });

  return (
    <div className="astw:min-w-0 astw:space-y-2">
      <Table.Root aria-label={claim}>
        <Table.Header>
          <Table.Row>
            {part.columns.map((column) => (
              <Table.Head
                key={column.key}
                scope="col"
                align={column.kind === "number" ? "right" : "left"}
              >
                {column.label}
              </Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {part.rows.map((row, index) => (
            <Table.Row
              key={index}
              title={row.ref}
              className={cn(row.muted && "astw:text-muted-foreground")}
            >
              {renderCells(row.cells)}
            </Table.Row>
          ))}
        </Table.Body>
        {part.footer && (
          <Table.Footer>
            <Table.Row>{renderCells(part.footer)}</Table.Row>
          </Table.Footer>
        )}
      </Table.Root>
      <Sources
        refs={[
          ...new Set([...part.refs, ...part.rows.flatMap((row) => (row.ref ? [row.ref] : []))]),
        ]}
        display={display}
      />
    </div>
  );
}

function ReportPartView({
  part,
  claim,
  display,
}: {
  part: ReportPart;
  claim: string;
  display: Display;
}) {
  switch (part.kind) {
    case "text":
      return <Response>{part.text}</Response>;
    case "metrics":
      return (
        <div className="astw:grid astw:grid-cols-1 astw:gap-3 astw:@[400px]:grid-cols-2 astw:@[600px]:grid-cols-3">
          {part.items.map((item, index) => (
            <div
              key={index}
              className="astw:min-w-0 astw:space-y-2 astw:rounded-lg astw:border astw:border-border astw:p-3"
            >
              <Text.div variant="label-md">{item.label}</Text.div>
              <Text.div variant="heading-md" className="astw:tabular-nums">
                {display.number(item.value)}
                {item.unit && ` ${item.unit}`}
              </Text.div>
              {item.tone && item.tone !== "neutral" && (
                <Status value={item.tone} display={display} />
              )}
              <Sources refs={[item.ref]} display={display} />
            </div>
          ))}
        </div>
      );
    case "chips":
      return (
        <div className="astw:flex astw:flex-wrap astw:gap-3">
          {part.items.map((item, index) => (
            <div key={index} className="astw:min-w-0 astw:space-y-1">
              <Text.div variant="label-md">{item.label}</Text.div>
              <div className="astw:flex astw:flex-wrap astw:items-center astw:gap-2">
                <Badge variant={statusVariants[item.tone ?? "neutral"]}>{item.value}</Badge>
                {item.tone && item.tone !== "neutral" && (
                  <Status value={item.tone} display={display} />
                )}
              </div>
              {item.sub && (
                <Text.div variant="body-sm" className="astw:text-muted-foreground">
                  {item.sub}
                </Text.div>
              )}
              <Sources refs={[item.ref]} display={display} />
            </div>
          ))}
        </div>
      );
    case "fields":
      return (
        <dl className="astw:grid astw:grid-cols-1 astw:gap-3 astw:@[400px]:grid-cols-2">
          {part.items.map((item, index) => (
            <div key={index} className="astw:min-w-0 astw:space-y-1">
              <Text variant="label-md" render={<dt />}>
                {item.label}
              </Text>
              <dd className="astw:space-y-1">
                <Text.div>{item.value ?? display.t("unknownValue")}</Text.div>
                {item.verdict && <Status value={item.verdict} display={display} />}
                {item.previous !== undefined && (
                  <Text.div variant="body-sm" className="astw:text-muted-foreground">
                    {display.t("previous", { value: item.previous })}
                  </Text.div>
                )}
                <Sources refs={[item.ref]} display={display} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return <ReportTable part={part} claim={claim} display={display} />;
    case "list":
      return (
        <ul className="astw:list-disc astw:space-y-2 astw:pl-5 astw:text-body-md">
          {part.items.map((item, index) => (
            <li key={index}>
              <Text.span variant="body-md">{item.text}</Text.span>
              {item.tone && item.tone !== "neutral" && (
                <Status value={item.tone} display={display} />
              )}
              {item.ref && <Sources refs={[item.ref]} display={display} />}
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <Alert.Root variant={calloutVariants[part.tone]} role="note">
          {part.title && <Alert.Title>{part.title}</Alert.Title>}
          <Alert.Description>
            <Response>{part.text}</Response>
            {part.ref && <Sources refs={[part.ref]} display={display} />}
          </Alert.Description>
        </Alert.Root>
      );
    case "checklist":
      return (
        <ul className="astw:space-y-3">
          {part.items.map((item, index) => (
            <li key={index} className="astw:space-y-1">
              <div className="astw:flex astw:flex-wrap astw:items-center astw:gap-2">
                <Status value={item.status} display={display} />
                <Text.span>{item.label}</Text.span>
              </div>
              {item.detail && <Text.div variant="body-sm">{item.detail}</Text.div>}
              {item.ref && <Sources refs={[item.ref]} display={display} />}
            </li>
          ))}
        </ul>
      );
    case "timeline":
      return (
        <ol className="astw:space-y-3 astw:border-l astw:border-border astw:pl-4">
          {part.events.map((event, index) => (
            <li key={index} className="astw:space-y-1">
              <div className="astw:flex astw:flex-wrap astw:items-center astw:gap-2">
                <Text
                  variant="body-sm"
                  className="astw:text-muted-foreground"
                  render={<time dateTime={event.at} />}
                >
                  {display.dateTime(event.at)}
                </Text>
                <Badge variant="subtle-neutral">{display.t(event.kind)}</Badge>
              </div>
              <Text.div variant="label-md">{event.label}</Text.div>
              {event.detail && <Text.div variant="body-sm">{event.detail}</Text.div>}
              <Sources refs={[event.ref]} display={display} />
            </li>
          ))}
        </ol>
      );
  }
}

function ReportView({ data }: { data: ReportData }) {
  const { locale } = useResolvedLocale();
  const { value: timeZone } = useTimeZone();
  const t = labels.useT();
  const numbers = new Intl.NumberFormat(locale);
  const dates = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  const display: Display = {
    t,
    number: (value) => numbers.format(value),
    dateTime: (value) => dates.format(new Date(value)),
  };
  return (
    <Card.Root className="astw:@container" data-slot="generative-ui-report">
      <Card.Content className="astw:space-y-6">
        {data.blocks.map((block, index) => (
          <section key={index} className="astw:space-y-3">
            <Response>{block.text}</Response>
            {!!block.parts?.length && (
              <div
                className={cn(
                  "astw:grid astw:gap-4",
                  block.parts.length === 2 && "astw:@[600px]:grid-cols-2",
                  block.parts.length === 3 && "astw:@[600px]:grid-cols-3",
                )}
              >
                {block.parts.map((part, partIndex) => (
                  <div key={partIndex} className="astw:min-w-0">
                    <ReportPartView part={part} claim={block.text} display={display} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </Card.Content>
    </Card.Root>
  );
}

export const reportCard: GenerativeUICardDefinition<AIChatToolSchema<ReportData, ReportData>> = {
  schema: reportSchema,
  component: ReportView,
};
