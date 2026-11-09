import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityCard } from "./standalone";

const mockActivities = [
  {
    id: "1",
    actor: { name: "Hanna" },
    description: "changed the status from DRAFT to CONFIRMED",
    timestamp: new Date("2025-03-21T09:00:00"),
  },
  {
    id: "2",
    actor: { name: "Pradeep Kumar" },
    description: "created this PO",
    timestamp: new Date("2025-03-21T15:16:00"),
  },
];

afterEach(() => {
  cleanup();
});

describe("ActivityCard (standalone)", () => {
  it("renders title when provided", () => {
    render(<ActivityCard items={mockActivities} title="Updates" />);
    expect(screen.getByText("Updates")).toBeDefined();
  });

  it("renders empty state when no activities", () => {
    render(<ActivityCard items={[]} title="Updates" />);
    expect(screen.getByText("No activities yet")).toBeDefined();
  });

  it("renders activity descriptions and timestamps", () => {
    render(<ActivityCard items={mockActivities} title="Updates" />);
    expect(screen.getByText(/Hanna/)).toBeDefined();
    expect(screen.getByText(/changed the status/)).toBeDefined();
    expect(screen.getByText(/Pradeep Kumar/)).toBeDefined();
    expect(screen.getByText(/created this PO/)).toBeDefined();
  });

  it("shows overflow count and opens dialog on click", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 8 }, (_, i) => ({
      ...mockActivities[0],
      id: `id-${i}`,
    }));
    render(<ActivityCard items={many} title="Updates" maxVisible={6} />);
    const overflowButton = screen.getByText("2 more activities");
    expect(overflowButton).toBeDefined();
    await user.click(overflowButton);
    expect(screen.getByText("All activities")).toBeDefined();
  });

  it("uses count overflow label when overflowLabel is count", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      ...mockActivities[0],
      id: `id-${i}`,
    }));
    render(<ActivityCard items={many} title="Updates" maxVisible={6} overflowLabel="count" />);
    expect(screen.getByText("+2")).toBeDefined();
  });
});

interface CustomActivity {
  id: string;
  timestamp: Date | string;
  description: string;
}

interface CustomMessageActivity {
  id: string;
  timestamp: Date | string;
  message: string;
}

describe("ActivityCard (compound)", () => {
  it("renders with custom items via Root/Items/Item", () => {
    render(
      <ActivityCard.Root<CustomActivity> items={mockActivities} title="Custom">
        <ActivityCard.Items<CustomActivity>>
          {(item) => (
            <ActivityCard.Item>
              <p>{item.description}</p>
            </ActivityCard.Item>
          )}
        </ActivityCard.Items>
      </ActivityCard.Root>,
    );
    expect(screen.getByText("Custom")).toBeDefined();
    expect(screen.getByText("changed the status from DRAFT to CONFIRMED")).toBeDefined();
    expect(screen.getByText("created this PO")).toBeDefined();
  });

  it("renders indicator when provided", () => {
    render(
      <ActivityCard.Root<CustomActivity> items={mockActivities} title="With Indicator">
        <ActivityCard.Items<CustomActivity>>
          {(item) => (
            <ActivityCard.Item indicator={<span data-testid="icon">★</span>}>
              <p>{item.description}</p>
            </ActivityCard.Item>
          )}
        </ActivityCard.Items>
      </ActivityCard.Root>,
    );
    expect(screen.getAllByTestId("icon")).toHaveLength(2);
  });

  it("shows overflow in compound mode", async () => {
    const user = userEvent.setup();
    const many: CustomMessageActivity[] = Array.from({ length: 8 }, (_, i) => ({
      id: `id-${i}`,
      timestamp: new Date("2025-03-21T09:00:00"),
      message: `Activity ${i}`,
    }));
    render(
      <ActivityCard.Root<CustomMessageActivity> items={many} title="Overflow" maxVisible={6}>
        <ActivityCard.Items<CustomMessageActivity>>
          {(item) => (
            <ActivityCard.Item>
              <p>{item.message}</p>
            </ActivityCard.Item>
          )}
        </ActivityCard.Items>
      </ActivityCard.Root>,
    );
    const overflowButton = screen.getByText("2 more activities");
    expect(overflowButton).toBeDefined();
    await user.click(overflowButton);
    expect(screen.getByText("All activities")).toBeDefined();
  });
});
