export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  publishedAt: string;
  availableOn: string;
  restockAt: string;
  price: number;
  stock: number;
  status: "Active" | "Draft" | "Archived";
  tags: string[];
};

// Hand-authored products with rich, varied copy. These lead the list so the
// first page always shows realistic, curated data. The remainder is generated
// below to give the table ~200 rows for pagination/sorting/scroll testing.
const curatedProducts: Product[] = [
  {
    id: "p-001",
    name: "Ergonomic Chair",
    description:
      "Adjustable lumbar support, breathable mesh back, and 4D armrests engineered for full-day comfort across body types and desk heights.",
    category: "Furniture",
    publishedAt: "2026-01-05T09:15:00Z",
    availableOn: "2026-02-01",
    restockAt: "09:30",
    price: 499.99,
    stock: 42,
    status: "Active",
    tags: ["Ergonomic", "Office", "Best Seller"],
  },
  {
    id: "p-002",
    name: "Standing Desk",
    description:
      "Dual electric motors lift 270 lbs from 24 to 50 inches in seconds, with four programmable height presets and silent sub-50 dB operation.",
    category: "Furniture",
    publishedAt: "2026-01-12T11:45:00Z",
    availableOn: "2026-02-05",
    restockAt: "10:15",
    price: 899.0,
    stock: 15,
    status: "Active",
    tags: ["Motorized", "Office", "Adjustable", "Premium"],
  },
  {
    id: "p-003",
    name: "Mechanical Keyboard",
    description: "Hot-swappable switches and per-key RGB.",
    category: "Electronics",
    publishedAt: "2026-01-19T14:00:00Z",
    availableOn: "2026-02-08",
    restockAt: "08:45",
    price: 159.99,
    stock: 230,
    status: "Active",
    tags: ["Mechanical", "RGB", "Hot-swap"],
  },
  {
    id: "p-004",
    name: "USB-C Hub",
    description:
      "Seven-in-one passthrough hub: 100 W power delivery, 4K HDMI, gigabit Ethernet, SD/microSD, and two USB-A ports in a single braided cable.",
    category: "Electronics",
    publishedAt: "2026-01-22T16:20:00Z",
    availableOn: "2026-02-12",
    restockAt: "13:00",
    price: 79.99,
    stock: 0,
    status: "Draft",
    tags: ["USB-C", "Portable"],
  },
  {
    id: "p-005",
    name: "Monitor Arm",
    description:
      "Counter-balanced single-monitor mount supporting screens up to 34 inches and 19 lbs, with full-motion articulation and integrated cable routing.",
    category: "Accessories",
    publishedAt: "2026-01-28T07:30:00Z",
    availableOn: "2026-02-15",
    restockAt: "15:30",
    price: 129.0,
    stock: 57,
    status: "Active",
    tags: ["Ergonomic", "Adjustable"],
  },
  {
    id: "p-006",
    name: "Webcam HD",
    description: "1080p sensor with autofocus and a stereo mic.",
    category: "Electronics",
    publishedAt: "2026-02-02T12:10:00Z",
    availableOn: "2026-02-18",
    restockAt: "11:00",
    price: 89.99,
    stock: 120,
    status: "Archived",
    tags: ["HD", "Autofocus"],
  },
  {
    id: "p-007",
    name: "Desk Lamp",
    description:
      "Tunable warm-to-cool LED desk lamp with five brightness levels, a touch dimmer, and a USB charging port built into the weighted base.",
    category: "Accessories",
    publishedAt: "2026-02-06T18:05:00Z",
    availableOn: "2026-02-20",
    restockAt: "17:45",
    price: 45.0,
    stock: 88,
    status: "Active",
    tags: ["LED", "USB Charging"],
  },
  {
    id: "p-008",
    name: "Cable Tray",
    description:
      "Under-desk steel cable management tray with snap-on cover, mounting hardware, and a perforated channel that keeps power bricks ventilated.",
    category: "Accessories",
    publishedAt: "2026-02-10T10:00:00Z",
    availableOn: "2026-02-22",
    restockAt: "14:20",
    price: 29.99,
    stock: 200,
    status: "Draft",
    tags: ["Cable Management"],
  },
  {
    id: "p-009",
    name: "Noise-Cancelling Headphones",
    description:
      "Over-ear ANC headphones with a 36-hour battery, adaptive transparency mode, multipoint Bluetooth 5.3, and memory-foam ear cushions for long sessions.",
    category: "Electronics",
    publishedAt: "2026-02-14T08:50:00Z",
    availableOn: "2026-02-25",
    restockAt: "09:10",
    price: 349.99,
    stock: 64,
    status: "Active",
    tags: ["ANC", "Bluetooth", "Wireless", "Premium"],
  },
  {
    id: "p-010",
    name: "Laptop Stand",
    description: "Aluminum riser, folds flat for travel.",
    category: "Accessories",
    publishedAt: "2026-02-17T13:25:00Z",
    availableOn: "2026-02-28",
    restockAt: "16:40",
    price: 59.99,
    stock: 110,
    status: "Active",
    tags: ["Portable", "Foldable"],
  },
  {
    id: "p-011",
    name: "Wireless Mouse",
    description:
      "Ergonomic right-handed wireless mouse with a 4000 DPI optical sensor, six programmable buttons, and a USB-C rechargeable battery rated for 70 days.",
    category: "Electronics",
    publishedAt: "2026-02-20T06:40:00Z",
    availableOn: "2026-03-02",
    restockAt: "07:20",
    price: 69.99,
    stock: 180,
    status: "Active",
    tags: ["Ergonomic", "Wireless", "Rechargeable"],
  },
  {
    id: "p-012",
    name: "Desk Mat",
    description:
      "Large 36x18 inch felt-and-cork desk mat with a non-slip backing and a stitched edge that resists curling after months of daily mouse travel.",
    category: "Accessories",
    publishedAt: "2026-02-23T15:55:00Z",
    availableOn: "2026-03-05",
    restockAt: "12:30",
    price: 34.99,
    stock: 300,
    status: "Active",
    tags: ["Eco-friendly", "Non-slip"],
  },
  {
    id: "p-013",
    name: "Bookshelf",
    description:
      "Five-shelf engineered-wood bookshelf with steel reinforcement bars, anti-tip wall mounts, and adjustable shelf heights for oversized volumes.",
    category: "Furniture",
    publishedAt: "2026-02-26T09:05:00Z",
    availableOn: "2026-03-08",
    restockAt: "10:50",
    price: 249.0,
    stock: 22,
    status: "Draft",
    tags: ["Adjustable", "Heavy-duty"],
  },
  {
    id: "p-014",
    name: "Power Strip",
    description: "Eight outlets, surge protection, six-foot braided cord.",
    category: "Accessories",
    publishedAt: "2026-03-01T19:15:00Z",
    availableOn: "2026-03-11",
    restockAt: "18:00",
    price: 24.99,
    stock: 500,
    status: "Active",
    tags: ["Surge Protection"],
  },
  {
    id: "p-015",
    name: "Whiteboard",
    description:
      "Ghost-resistant porcelain steel whiteboard with an aluminum frame, magnetic surface, mounting cleat, and an integrated marker tray along the bottom.",
    category: "Furniture",
    publishedAt: "2026-03-04T11:35:00Z",
    availableOn: "2026-03-14",
    restockAt: "08:15",
    price: 189.0,
    stock: 18,
    status: "Active",
    tags: ["Magnetic", "Office"],
  },
  {
    id: "p-016",
    name: "USB Microphone",
    description:
      "Cardioid USB condenser with a built-in pop filter, zero-latency headphone monitoring, and a shock mount tuned for desk-strike isolation.",
    category: "Electronics",
    publishedAt: "2026-03-07T17:45:00Z",
    availableOn: "2026-03-17",
    restockAt: "11:40",
    price: 129.99,
    stock: 75,
    status: "Active",
    tags: ["USB", "Cardioid", "Streaming"],
  },
  {
    id: "p-017",
    name: "Filing Cabinet",
    description:
      "Two-drawer lateral file cabinet built from 22-gauge steel, with a keyed central lock, anti-tilt interlock, and full-extension ball-bearing slides.",
    category: "Furniture",
    publishedAt: "2026-03-10T08:25:00Z",
    availableOn: "2026-03-20",
    restockAt: "09:55",
    price: 349.0,
    stock: 8,
    status: "Draft",
    tags: ["Lockable", "Heavy-duty", "Office"],
  },
  {
    id: "p-018",
    name: "HDMI Cable",
    description: "6 ft, 4K @ 120 Hz, braided jacket.",
    category: "Accessories",
    publishedAt: "2026-03-13T14:30:00Z",
    availableOn: "2026-03-22",
    restockAt: "13:35",
    price: 14.99,
    stock: 600,
    status: "Active",
    tags: ["4K", "Braided"],
  },
  {
    id: "p-019",
    name: "Ergonomic Footrest",
    description:
      "Tilting under-desk footrest with a textured massaging surface, non-slip base, and 14 degrees of adjustable rocking motion for circulation.",
    category: "Furniture",
    publishedAt: "2026-03-16T10:10:00Z",
    availableOn: "2026-03-25",
    restockAt: "15:05",
    price: 79.0,
    stock: 45,
    status: "Archived",
    tags: ["Ergonomic", "Adjustable"],
  },
  {
    id: "p-020",
    name: "Docking Station",
    description:
      "Thunderbolt 4 docking station with dual 4K display outputs, 96 W laptop charging, 2.5 GbE Ethernet, and ten downstream USB ports for a complete desk hub.",
    category: "Electronics",
    publishedAt: "2026-03-19T16:50:00Z",
    availableOn: "2026-03-28",
    restockAt: "10:25",
    price: 199.99,
    stock: 33,
    status: "Active",
    tags: ["Thunderbolt", "USB-C", "4K", "Ethernet", "Premium"],
  },
];

// ---------------------------------------------------------------------------
// Generated products
//
// The 20 curated rows above are joined with generated rows to give the table
// ~200 products. Generation is fully deterministic (index-derived, no
// randomness) so the data is stable across reloads — deep-linked pages and
// sort/filter state stay reproducible.
// ---------------------------------------------------------------------------

const CATEGORIES = ["Furniture", "Electronics", "Accessories"] as const;

const NOUNS_BY_CATEGORY: Record<(typeof CATEGORIES)[number], string[]> = {
  Furniture: [
    "Chair",
    "Desk",
    "Bookshelf",
    "Cabinet",
    "Table",
    "Stool",
    "Shelf",
    "Locker",
    "Workbench",
    "Credenza",
    "Ottoman",
    "Partition",
  ],
  Electronics: [
    "Keyboard",
    "Mouse",
    "Monitor",
    "Webcam",
    "Microphone",
    "Headset",
    "Speaker",
    "Router",
    "Hub",
    "Adapter",
    "Charger",
    "Projector",
  ],
  Accessories: [
    "Lamp",
    "Mat",
    "Cable",
    "Tray",
    "Stand",
    "Organizer",
    "Holder",
    "Sleeve",
    "Riser",
    "Bin",
    "Clip",
    "Pad",
  ],
};

const DESCRIPTORS = [
  "Ergonomic",
  "Compact",
  "Deluxe",
  "Pro",
  "Premium",
  "Wireless",
  "Portable",
  "Modular",
  "Heavy-Duty",
  "Smart",
  "Eco",
  "Ultra",
  "Slim",
  "Executive",
  "Studio",
  "Classic",
];

const TAG_POOL = [
  "Ergonomic",
  "Office",
  "Wireless",
  "Premium",
  "Portable",
  "Adjustable",
  "Eco-friendly",
  "Best Seller",
  "Heavy-duty",
  "RGB",
  "4K",
  "USB-C",
  "Rechargeable",
  "Magnetic",
  "Foldable",
];

// Weighted toward "Active" so the default view is mostly live products, with a
// steady sprinkling of Draft/Archived for filter testing.
const STATUS_CYCLE: Product["status"][] = [
  "Active",
  "Active",
  "Active",
  "Draft",
  "Active",
  "Archived",
  "Active",
  "Draft",
  "Active",
  "Archived",
];

const DESCRIPTION_TEMPLATES: ((name: string, category: string) => string)[] = [
  (name) => `Compact, reliable ${name.toLowerCase()} with a clean finish and a hassle-free setup.`,
  (name, category) =>
    `${name} designed for ${category.toLowerCase()} setups, balancing durability and comfort for everyday professional use.`,
  (name, category) =>
    `Premium ${category.toLowerCase()}-grade ${name.toLowerCase()} featuring reinforced construction, thoughtful cable routing, and a warranty-backed build engineered to hold up across years of daily use.`,
];

const pad3 = (n: number) => String(n).padStart(3, "0");
const pad2 = (n: number) => String(n).padStart(2, "0");

// Fixed base so all generated dates are deterministic (2026-01-01T00:00:00Z).
const BASE_PUBLISH_MS = Date.parse("2026-01-01T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function generateProducts(count: number, startSeq: number): Product[] {
  const products: Product[] = [];

  for (let i = 0; i < count; i++) {
    const seq = startSeq + i;
    const category = CATEGORIES[i % CATEGORIES.length];
    const nouns = NOUNS_BY_CATEGORY[category];
    const noun = nouns[i % nouns.length];
    const descriptor = DESCRIPTORS[(i * 3) % DESCRIPTORS.length];
    const series = 1 + ((i * 7) % 5);
    const name = `${descriptor} ${noun}${series > 1 ? ` S${series}` : ""}`;

    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const price = Number((19.99 + ((i * 53) % 1250)).toFixed(2));
    // Occasionally out of stock, biased toward Draft items.
    const stock = status === "Draft" && i % 3 === 0 ? 0 : (i * 37) % 620;

    const publishedMs = BASE_PUBLISH_MS + seq * Math.floor(DAY_MS * 1.5);
    const publishedAt = new Date(publishedMs).toISOString();
    const availableOn = new Date(publishedMs + 20 * DAY_MS).toISOString().slice(0, 10);
    const restockAt = `${pad2(6 + (i % 12))}:${pad2((i * 5) % 60)}`;

    const tagCount = 1 + (i % 4);
    const tags = [
      ...new Set(
        Array.from({ length: tagCount }, (_, t) => TAG_POOL[(i * (t + 3)) % TAG_POOL.length]),
      ),
    ];

    const describe = DESCRIPTION_TEMPLATES[i % DESCRIPTION_TEMPLATES.length];

    products.push({
      id: `p-${pad3(seq)}`,
      name,
      description: describe(name, category),
      category,
      publishedAt,
      availableOn,
      restockAt,
      price,
      stock,
      status,
      tags,
    });
  }

  return products;
}

export const allProducts: Product[] = [
  ...curatedProducts,
  ...generateProducts(180, curatedProducts.length + 1),
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
