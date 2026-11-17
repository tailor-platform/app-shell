import { CheckCircle } from "lucide-react";
import { ActivityCard, Text, type ActivityCardBaseItem } from "@tailor-platform/app-shell";

const items = [
  {
    id: "1",
    actor: { name: "Hanna", avatarUrl: "/avatars/hanna.jpg" },
    description: "changed the status from DRAFT to CONFIRMED",
    timestamp: new Date("2025-03-21T09:00:00"),
  },
  {
    id: "2",
    actor: { name: "Pradeep Kumar" },
    description: "created this PO",
    timestamp: new Date("2025-03-21T15:16:00"),
  },
  {
    id: "3",
    description: "Status automatically changed to EXPIRED",
    timestamp: new Date("2025-03-20T10:00:00"),
  },
];

export function BasicUsage() {
  return <ActivityCard items={items} title="Updates" />;
}

export function CompoundItems() {
  interface MyItem extends ActivityCardBaseItem {
    kind: "approval" | "update";
    label?: string;
    message?: string;
  }

  const items: MyItem[] = [
    { id: "1", timestamp: "2026-03-21T09:00:00", kind: "approval", label: "PO approved" },
    {
      id: "2",
      timestamp: "2026-03-20T15:00:00",
      kind: "update",
      message: "Status changed to CONFIRMED",
    },
  ];

  return (
    <ActivityCard.Root items={items} title="Updates" groupBy="day">
      <ActivityCard.Items<MyItem>>
        {(item) =>
          item.kind === "approval" ? (
            <ActivityCard.Item indicator={<CheckCircle aria-hidden className="size-4" />}>
              <Text.p>{item.label}</Text.p>
            </ActivityCard.Item>
          ) : (
            <ActivityCard.Item>
              <Text.p>{item.message}</Text.p>
            </ActivityCard.Item>
          )
        }
      </ActivityCard.Items>
    </ActivityCard.Root>
  );
}
