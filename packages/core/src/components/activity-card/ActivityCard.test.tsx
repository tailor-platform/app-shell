import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityCard } from "./ActivityCard";

const mockActivities = [
  {
    id: "1",
    userDisplayName: "Hanna",
    description: "changed the status from DRAFT to CONFIRMED",
    timestamp: new Date("2025-03-21T09:00:00"),
  },
  {
    id: "2",
    userDisplayName: "Pradeep Kumar",
    description: "created this PO",
    timestamp: new Date("2025-03-21T15:16:00"),
  },
];

afterEach(() => {
  cleanup();
});

describe("ActivityCard", () => {
  it("renders title when provided", () => {
    render(<ActivityCard activities={mockActivities} title="Updates" />);
    expect(screen.getByText("Updates")).toBeDefined();
  });

  it("renders empty state when no activities", () => {
    render(<ActivityCard activities={[]} title="Updates" />);
    expect(screen.getByText("No activities yet")).toBeDefined();
  });

  it("renders activity descriptions and timestamps", () => {
    render(<ActivityCard activities={mockActivities} title="Updates" />);
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
    render(<ActivityCard activities={many} title="Updates" maxVisible={6} />);
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
    render(<ActivityCard activities={many} title="Updates" maxVisible={6} overflowLabel="count" />);
    expect(screen.getByText("+2")).toBeDefined();
  });
});
