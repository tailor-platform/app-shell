export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "Active" | "Draft" | "Archived";
};

export const allProducts: Product[] = [
  {
    id: "p-001",
    name: "Ergonomic Chair",
    category: "Furniture",
    price: 499.99,
    stock: 42,
    status: "Active",
  },
  {
    id: "p-002",
    name: "Standing Desk",
    category: "Furniture",
    price: 899.0,
    stock: 15,
    status: "Active",
  },
  {
    id: "p-003",
    name: "Mechanical Keyboard",
    category: "Electronics",
    price: 159.99,
    stock: 230,
    status: "Active",
  },
  {
    id: "p-004",
    name: "USB-C Hub",
    category: "Electronics",
    price: 79.99,
    stock: 0,
    status: "Draft",
  },
  {
    id: "p-005",
    name: "Monitor Arm",
    category: "Accessories",
    price: 129.0,
    stock: 57,
    status: "Active",
  },
  {
    id: "p-006",
    name: "Webcam HD",
    category: "Electronics",
    price: 89.99,
    stock: 120,
    status: "Archived",
  },
  {
    id: "p-007",
    name: "Desk Lamp",
    category: "Accessories",
    price: 45.0,
    stock: 88,
    status: "Active",
  },
  {
    id: "p-008",
    name: "Cable Tray",
    category: "Accessories",
    price: 29.99,
    stock: 200,
    status: "Draft",
  },
  {
    id: "p-009",
    name: "Noise-Cancelling Headphones",
    category: "Electronics",
    price: 349.99,
    stock: 64,
    status: "Active",
  },
  {
    id: "p-010",
    name: "Laptop Stand",
    category: "Accessories",
    price: 59.99,
    stock: 110,
    status: "Active",
  },
  {
    id: "p-011",
    name: "Wireless Mouse",
    category: "Electronics",
    price: 69.99,
    stock: 180,
    status: "Active",
  },
  {
    id: "p-012",
    name: "Desk Mat",
    category: "Accessories",
    price: 34.99,
    stock: 300,
    status: "Active",
  },
  {
    id: "p-013",
    name: "Bookshelf",
    category: "Furniture",
    price: 249.0,
    stock: 22,
    status: "Draft",
  },
  {
    id: "p-014",
    name: "Power Strip",
    category: "Accessories",
    price: 24.99,
    stock: 500,
    status: "Active",
  },
  {
    id: "p-015",
    name: "Whiteboard",
    category: "Furniture",
    price: 189.0,
    stock: 18,
    status: "Active",
  },
  {
    id: "p-016",
    name: "USB Microphone",
    category: "Electronics",
    price: 129.99,
    stock: 75,
    status: "Active",
  },
  {
    id: "p-017",
    name: "Filing Cabinet",
    category: "Furniture",
    price: 349.0,
    stock: 8,
    status: "Draft",
  },
  {
    id: "p-018",
    name: "HDMI Cable",
    category: "Accessories",
    price: 14.99,
    stock: 600,
    status: "Active",
  },
  {
    id: "p-019",
    name: "Ergonomic Footrest",
    category: "Furniture",
    price: 79.0,
    stock: 45,
    status: "Archived",
  },
  {
    id: "p-020",
    name: "Docking Station",
    category: "Electronics",
    price: 199.99,
    stock: 33,
    status: "Active",
  },
];

// ---------------------------------------------------------------------------
// Mock query hook (simulates a real useQuery call)
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import type { CollectionVariables } from "@tailor-platform/app-shell";

export function useProductsQuery(variables: CollectionVariables) {
  return useMemo(() => {
    // Sort
    let sorted = [...allProducts];
    if (variables.order && variables.order.length > 0) {
      const { field, direction } = variables.order[0];
      sorted.sort((a, b) => {
        const aVal = a[field as keyof Product];
        const bVal = b[field as keyof Product];
        if (aVal == null || bVal == null) return 0;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === "Desc" ? -cmp : cmp;
      });
    }

    // Paginate
    const pageSize = variables.pagination.first ?? variables.pagination.last ?? sorted.length;
    let page = 1;
    if (variables.pagination.after) {
      page = Number(variables.pagination.after);
    } else if (variables.pagination.before) {
      page = Number(variables.pagination.before);
    }
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, sorted.length);
    const pageRows = sorted.slice(start, end);
    const hasNextPage = end < sorted.length;
    const hasPreviousPage = page > 1;

    return {
      data: {
        edges: pageRows.map((node) => ({ node })),
        pageInfo: {
          hasNextPage,
          endCursor: hasNextPage ? String(page + 1) : null,
          hasPreviousPage,
          startCursor: hasPreviousPage ? String(page - 1) : null,
        },
        total: sorted.length,
      },
      loading: false,
    };
  }, [
    variables.pagination.first,
    variables.pagination.last,
    variables.pagination.after,
    variables.pagination.before,
    variables.order,
  ]);
}
