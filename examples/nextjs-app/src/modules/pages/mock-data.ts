export type Product = {
  id: string;
  name: string;
  category: string;
  publishedAt: string;
  availableOn: string;
  restockAt: string;
  price: number;
  stock: number;
  status: "Active" | "Draft" | "Archived";
};

export const allProducts: Product[] = [
  {
    id: "p-001",
    name: "Ergonomic Chair",
    category: "Furniture",
    publishedAt: "2026-01-05T09:15:00Z",
    availableOn: "2026-02-01",
    restockAt: "09:30",
    price: 499.99,
    stock: 42,
    status: "Active",
  },
  {
    id: "p-002",
    name: "Standing Desk",
    category: "Furniture",
    publishedAt: "2026-01-12T11:45:00Z",
    availableOn: "2026-02-05",
    restockAt: "10:15",
    price: 899.0,
    stock: 15,
    status: "Active",
  },
  {
    id: "p-003",
    name: "Mechanical Keyboard",
    category: "Electronics",
    publishedAt: "2026-01-19T14:00:00Z",
    availableOn: "2026-02-08",
    restockAt: "08:45",
    price: 159.99,
    stock: 230,
    status: "Active",
  },
  {
    id: "p-004",
    name: "USB-C Hub",
    category: "Electronics",
    publishedAt: "2026-01-22T16:20:00Z",
    availableOn: "2026-02-12",
    restockAt: "13:00",
    price: 79.99,
    stock: 0,
    status: "Draft",
  },
  {
    id: "p-005",
    name: "Monitor Arm",
    category: "Accessories",
    publishedAt: "2026-01-28T07:30:00Z",
    availableOn: "2026-02-15",
    restockAt: "15:30",
    price: 129.0,
    stock: 57,
    status: "Active",
  },
  {
    id: "p-006",
    name: "Webcam HD",
    category: "Electronics",
    publishedAt: "2026-02-02T12:10:00Z",
    availableOn: "2026-02-18",
    restockAt: "11:00",
    price: 89.99,
    stock: 120,
    status: "Archived",
  },
  {
    id: "p-007",
    name: "Desk Lamp",
    category: "Accessories",
    publishedAt: "2026-02-06T18:05:00Z",
    availableOn: "2026-02-20",
    restockAt: "17:45",
    price: 45.0,
    stock: 88,
    status: "Active",
  },
  {
    id: "p-008",
    name: "Cable Tray",
    category: "Accessories",
    publishedAt: "2026-02-10T10:00:00Z",
    availableOn: "2026-02-22",
    restockAt: "14:20",
    price: 29.99,
    stock: 200,
    status: "Draft",
  },
  {
    id: "p-009",
    name: "Noise-Cancelling Headphones",
    category: "Electronics",
    publishedAt: "2026-02-14T08:50:00Z",
    availableOn: "2026-02-25",
    restockAt: "09:10",
    price: 349.99,
    stock: 64,
    status: "Active",
  },
  {
    id: "p-010",
    name: "Laptop Stand",
    category: "Accessories",
    publishedAt: "2026-02-17T13:25:00Z",
    availableOn: "2026-02-28",
    restockAt: "16:40",
    price: 59.99,
    stock: 110,
    status: "Active",
  },
  {
    id: "p-011",
    name: "Wireless Mouse",
    category: "Electronics",
    publishedAt: "2026-02-20T06:40:00Z",
    availableOn: "2026-03-02",
    restockAt: "07:20",
    price: 69.99,
    stock: 180,
    status: "Active",
  },
  {
    id: "p-012",
    name: "Desk Mat",
    category: "Accessories",
    publishedAt: "2026-02-23T15:55:00Z",
    availableOn: "2026-03-05",
    restockAt: "12:30",
    price: 34.99,
    stock: 300,
    status: "Active",
  },
  {
    id: "p-013",
    name: "Bookshelf",
    category: "Furniture",
    publishedAt: "2026-02-26T09:05:00Z",
    availableOn: "2026-03-08",
    restockAt: "10:50",
    price: 249.0,
    stock: 22,
    status: "Draft",
  },
  {
    id: "p-014",
    name: "Power Strip",
    category: "Accessories",
    publishedAt: "2026-03-01T19:15:00Z",
    availableOn: "2026-03-11",
    restockAt: "18:00",
    price: 24.99,
    stock: 500,
    status: "Active",
  },
  {
    id: "p-015",
    name: "Whiteboard",
    category: "Furniture",
    publishedAt: "2026-03-04T11:35:00Z",
    availableOn: "2026-03-14",
    restockAt: "08:15",
    price: 189.0,
    stock: 18,
    status: "Active",
  },
  {
    id: "p-016",
    name: "USB Microphone",
    category: "Electronics",
    publishedAt: "2026-03-07T17:45:00Z",
    availableOn: "2026-03-17",
    restockAt: "11:40",
    price: 129.99,
    stock: 75,
    status: "Active",
  },
  {
    id: "p-017",
    name: "Filing Cabinet",
    category: "Furniture",
    publishedAt: "2026-03-10T08:25:00Z",
    availableOn: "2026-03-20",
    restockAt: "09:55",
    price: 349.0,
    stock: 8,
    status: "Draft",
  },
  {
    id: "p-018",
    name: "HDMI Cable",
    category: "Accessories",
    publishedAt: "2026-03-13T14:30:00Z",
    availableOn: "2026-03-22",
    restockAt: "13:35",
    price: 14.99,
    stock: 600,
    status: "Active",
  },
  {
    id: "p-019",
    name: "Ergonomic Footrest",
    category: "Furniture",
    publishedAt: "2026-03-16T10:10:00Z",
    availableOn: "2026-03-25",
    restockAt: "15:05",
    price: 79.0,
    stock: 45,
    status: "Archived",
  },
  {
    id: "p-020",
    name: "Docking Station",
    category: "Electronics",
    publishedAt: "2026-03-19T16:50:00Z",
    availableOn: "2026-03-28",
    restockAt: "10:25",
    price: 199.99,
    stock: 33,
    status: "Active",
  },
];

// ---------------------------------------------------------------------------
// Mock query hook (simulates a real useQuery call)
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
  const value = String(fieldValue ?? "").toLowerCase();
  const needle = String(expected ?? "").toLowerCase();

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

function applyQueryFilters(products: Product[], variables: CollectionVariables): Product[] {
  if (!variables.query) return [...products];

  return products.filter((product) => {
    return Object.entries(variables.query ?? {}).every(([field, operators]) => {
      const fieldValue = product[field as keyof Product];
      return Object.entries(operators ?? {}).every(([operator, expected]) => {
        return matchOperator(fieldValue, operator, expected);
      });
    });
  });
}

export function useProductsQuery(variables: CollectionVariables) {
  const result = useMemo(() => {
    // Filter
    let rows = applyQueryFilters(allProducts, variables);

    // Sort
    if (variables.order && variables.order.length > 0) {
      rows.sort((a, b) => {
        for (const { field, direction } of variables.order!) {
          const aVal = a[field as keyof Product];
          const bVal = b[field as keyof Product];
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
