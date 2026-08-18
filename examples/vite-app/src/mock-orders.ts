export type OrderStatus = "Processing" | "Shipped" | "Delivered" | "Cancelled";
export type OrderChannel = "Web" | "Retail" | "Phone";

export type Order = {
  id: string;
  customer: string;
  status: OrderStatus;
  channel: OrderChannel;
  items: number;
  total: number;
  /** Calendar date (`YYYY-MM-DD`) — rendered and filtered as a `date` column. */
  placedOn: string;
};

export const allOrders: Order[] = [
  {
    id: "ord-1001",
    customer: "Acme Corporation",
    status: "Delivered",
    channel: "Web",
    items: 12,
    total: 8900.0,
    placedOn: "2026-01-04",
  },
  {
    id: "ord-1002",
    customer: "Globex Industries",
    status: "Shipped",
    channel: "Phone",
    items: 3,
    total: 1200.5,
    placedOn: "2026-01-09",
  },
  {
    id: "ord-1003",
    customer: "Initech LLC",
    status: "Processing",
    channel: "Web",
    items: 7,
    total: 3450.0,
    placedOn: "2026-01-15",
  },
  {
    id: "ord-1004",
    customer: "Umbrella Co",
    status: "Cancelled",
    channel: "Retail",
    items: 1,
    total: 249.99,
    placedOn: "2026-01-19",
  },
  {
    id: "ord-1005",
    customer: "Stark Enterprises",
    status: "Delivered",
    channel: "Web",
    items: 24,
    total: 15200.0,
    placedOn: "2026-01-23",
  },
  {
    id: "ord-1006",
    customer: "Wayne Holdings",
    status: "Shipped",
    channel: "Phone",
    items: 5,
    total: 2199.0,
    placedOn: "2026-02-02",
  },
  {
    id: "ord-1007",
    customer: "Wonka Industries",
    status: "Processing",
    channel: "Retail",
    items: 9,
    total: 4780.25,
    placedOn: "2026-02-06",
  },
  {
    id: "ord-1008",
    customer: "Cyberdyne Systems",
    status: "Delivered",
    channel: "Web",
    items: 2,
    total: 649.0,
    placedOn: "2026-02-11",
  },
  {
    id: "ord-1009",
    customer: "Soylent Corp",
    status: "Shipped",
    channel: "Web",
    items: 18,
    total: 9975.5,
    placedOn: "2026-02-14",
  },
  {
    id: "ord-1010",
    customer: "Hooli",
    status: "Processing",
    channel: "Phone",
    items: 4,
    total: 1580.0,
    placedOn: "2026-02-20",
  },
  {
    id: "ord-1011",
    customer: "Pied Piper",
    status: "Delivered",
    channel: "Web",
    items: 1,
    total: 129.99,
    placedOn: "2026-02-24",
  },
  {
    id: "ord-1012",
    customer: "Vehement Capital",
    status: "Cancelled",
    channel: "Retail",
    items: 6,
    total: 2340.0,
    placedOn: "2026-02-27",
  },
  {
    id: "ord-1013",
    customer: "Massive Dynamic",
    status: "Shipped",
    channel: "Web",
    items: 33,
    total: 21450.0,
    placedOn: "2026-03-03",
  },
  {
    id: "ord-1014",
    customer: "Gringotts Bank",
    status: "Processing",
    channel: "Phone",
    items: 8,
    total: 5120.75,
    placedOn: "2026-03-07",
  },
  {
    id: "ord-1015",
    customer: "Oscorp",
    status: "Delivered",
    channel: "Web",
    items: 14,
    total: 7300.0,
    placedOn: "2026-03-10",
  },
  {
    id: "ord-1016",
    customer: "Tyrell Corporation",
    status: "Shipped",
    channel: "Retail",
    items: 2,
    total: 899.0,
    placedOn: "2026-03-14",
  },
  {
    id: "ord-1017",
    customer: "Nakatomi Trading",
    status: "Processing",
    channel: "Web",
    items: 11,
    total: 6250.0,
    placedOn: "2026-03-18",
  },
  {
    id: "ord-1018",
    customer: "Wernham Hogg",
    status: "Delivered",
    channel: "Phone",
    items: 5,
    total: 1875.5,
    placedOn: "2026-03-21",
  },
  {
    id: "ord-1019",
    customer: "Bluth Company",
    status: "Cancelled",
    channel: "Retail",
    items: 1,
    total: 349.0,
    placedOn: "2026-03-25",
  },
  {
    id: "ord-1020",
    customer: "Dunder Mifflin",
    status: "Shipped",
    channel: "Web",
    items: 40,
    total: 3200.0,
    placedOn: "2026-03-28",
  },
  {
    id: "ord-1021",
    customer: "Prestige Worldwide",
    status: "Processing",
    channel: "Web",
    items: 16,
    total: 8640.0,
    placedOn: "2026-04-01",
  },
  {
    id: "ord-1022",
    customer: "Sterling Cooper",
    status: "Delivered",
    channel: "Phone",
    items: 3,
    total: 1120.0,
    placedOn: "2026-04-05",
  },
];

// ---------------------------------------------------------------------------
// Mock query hook (simulates a real remote `useQuery` call, latency included)
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionVariables } from "@tailor-platform/app-shell";

const MOCK_LATENCY_MS = 800;

function compareValues(left: unknown, right: unknown): number | null {
  if (typeof left === "number" && typeof right === "number") {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof left === "string" && typeof right === "string") {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  return null;
}

function matchStringOperator(fieldValue: unknown, operator: string, expected: unknown): boolean {
  const value = String(fieldValue ?? "");
  const needle = String(expected ?? "");

  switch (operator) {
    case "contains":
      return value.includes(needle);
    case "notContains":
      return !value.includes(needle);
    case "hasPrefix":
      return value.startsWith(needle);
    case "hasSuffix":
      return value.endsWith(needle);
    case "notHasPrefix":
      return !value.startsWith(needle);
    case "notHasSuffix":
      return !value.endsWith(needle);
    default:
      return false;
  }
}

function matchOperator(fieldValue: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case "eq":
      return fieldValue === expected;
    case "ne":
      return fieldValue !== expected;
    case "in":
      return Array.isArray(expected) && expected.some((item) => item === fieldValue);
    case "nin":
      return Array.isArray(expected) && !expected.some((item) => item === fieldValue);
    case "regex": {
      const pattern = String(expected ?? "");
      const caseInsensitive = pattern.startsWith("(?i)");
      const regexBody = caseInsensitive ? pattern.slice(4) : pattern;
      const re = new RegExp(regexBody, caseInsensitive ? "i" : "");
      return re.test(String(fieldValue ?? ""));
    }
    case "contains":
    case "notContains":
    case "hasPrefix":
    case "hasSuffix":
    case "notHasPrefix":
    case "notHasSuffix":
      return matchStringOperator(fieldValue, operator, expected);
    case "gt": {
      const compared = compareValues(fieldValue, expected);
      return compared != null && compared > 0;
    }
    case "gte": {
      const compared = compareValues(fieldValue, expected);
      return compared != null && compared >= 0;
    }
    case "lt": {
      const compared = compareValues(fieldValue, expected);
      return compared != null && compared < 0;
    }
    case "lte": {
      const compared = compareValues(fieldValue, expected);
      return compared != null && compared <= 0;
    }
    case "between": {
      if (!expected || typeof expected !== "object") return false;
      const range = expected as { min?: unknown; max?: unknown };
      const minCompared =
        range.min === undefined || range.min === null ? 0 : compareValues(fieldValue, range.min);
      const maxCompared =
        range.max === undefined || range.max === null ? 0 : compareValues(fieldValue, range.max);
      const passMin = minCompared != null && minCompared >= 0;
      const passMax = maxCompared != null && maxCompared <= 0;
      return passMin && passMax;
    }
    default:
      // Ignore unsupported operators in mock mode.
      return true;
  }
}

function applyQueryFilters(orders: Order[], variables: CollectionVariables): Order[] {
  if (!variables.query) return [...orders];

  return orders.filter((order) => {
    return Object.entries(variables.query ?? {}).every(([field, operators]) => {
      const fieldValue = order[field as keyof Order];
      return Object.entries(operators ?? {}).every(([operator, expected]) => {
        return matchOperator(fieldValue, operator, expected);
      });
    });
  });
}

export function useOrdersQuery(variables: CollectionVariables) {
  const result = useMemo(() => {
    // Filter
    const rows = applyQueryFilters(allOrders, variables);

    // Sort
    if (variables.order && variables.order.length > 0) {
      rows.sort((a, b) => {
        for (const { field, direction } of variables.order!) {
          const aVal = a[field as keyof Order];
          const bVal = b[field as keyof Order];
          if (aVal == null || bVal == null) continue;
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          if (cmp !== 0) return direction === "Desc" ? -cmp : cmp;
        }
        return 0;
      });
    }

    // Paginate
    const pageSize = variables.pagination.first ?? variables.pagination.last ?? rows.length;
    let page = 1;
    if (variables.pagination.after) {
      page = Number(variables.pagination.after);
    } else if (variables.pagination.before) {
      page = Number(variables.pagination.before);
    } else if (variables.pagination.last && !variables.pagination.before) {
      // last without before = last page
      page = Math.max(1, Math.ceil(rows.length / pageSize));
    }
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, rows.length);
    const pageRows = rows.slice(start, end);
    const hasNextPage = end < rows.length;
    const hasPreviousPage = page > 1;

    return {
      edges: pageRows.map((node) => ({ node })),
      pageInfo: {
        hasNextPage,
        endCursor: hasNextPage ? String(page + 1) : null,
        hasPreviousPage,
        startCursor: hasPreviousPage ? String(page - 1) : null,
      },
      total: rows.length,
    };
  }, [variables]);

  // Re-fetch on every variables change, exposing a `loading` window so the
  // DataTable's loading state is exercised (skeleton rows, disabled controls).
  const [data, setData] = useState<typeof result | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setData(result);
      setLoading(false);
    }, MOCK_LATENCY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [result]);

  return { data, loading };
}
