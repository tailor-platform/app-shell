import { ActivityCard } from "@tailor-platform/app-shell";

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
