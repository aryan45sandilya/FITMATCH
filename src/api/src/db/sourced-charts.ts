/**
 * Size charts transcribed from brands' OFFICIAL websites (menswear, body measurements, cm).
 *
 * - Collected by reading each brand's own size guide in a browser on the date below.
 *   Third-party "size chart" aggregator sites were deliberately NOT used.
 * - Stored with is_demo = false and verification_status = 'pending': a person should
 *   compare each chart against its source URL before marking it verified in the admin panel.
 * - Single values on a brand chart (e.g. "Neckline 38") are stored as a zero-width range.
 * - Brands update charts without notice; re-check sources periodically.
 */
import type { BodyKey } from "../engine/types.js";

export type Market = "IN" | "US" | "UK_EU";
type Range = [number, number];

export interface SourcedChart {
  brand: string; // brand slug
  market: Market;
  categories: string[]; // category slugs this chart applies to
  name: string;
  sourceUrl: string;
  source: string;
  collectedAt: string;
  notes?: string;
  /** "body" (default): body measurements each size fits. "garment": finished-garment measurements. */
  basis?: "body" | "garment";
  sizes: { label: string; points: Partial<Record<BodyKey | "body_length", Range>> }[];
}

const COLLECTED = "2026-11-05";
const TOPS = ["t-shirts", "polo-t-shirts", "shirts", "hoodies", "jackets"];

// ── H&M ─────────────────────────────────────────────────────────────────────
// Product-page "Size guide – Tops, shirts, jackets, blazers etc." (Regular) and
// "Size guide – inch size conversions" (jeans). India's tops chart differs from US/UK.
const hmJeans: SourcedChart["sizes"] = [
  { label: "25", points: { waist: [64, 67], hip: [84, 86] } },
  { label: "26", points: { waist: [67, 70], hip: [86, 88] } },
  { label: "27", points: { waist: [70, 73], hip: [88, 90] } },
  { label: "28", points: { waist: [73, 75], hip: [90, 92] } },
  { label: "29", points: { waist: [75, 78], hip: [92, 94] } },
  { label: "30", points: { waist: [78, 81], hip: [94, 97] } },
  { label: "31", points: { waist: [81, 84], hip: [97, 99] } },
  { label: "32", points: { waist: [84, 87], hip: [99, 101] } },
  { label: "33", points: { waist: [87, 89], hip: [101, 103] } },
  { label: "34", points: { waist: [89, 92], hip: [103, 105] } },
  { label: "36", points: { waist: [94, 98], hip: [106, 109] } },
  { label: "38", points: { waist: [100, 104], hip: [110, 113] } },
  { label: "40", points: { waist: [106, 110], hip: [114, 117] } },
  { label: "42", points: { waist: [112, 116], hip: [118, 121] } },
  { label: "44", points: { waist: [118, 122], hip: [122, 125] } },
];

const hmTopsUsUk: SourcedChart["sizes"] = [
  { label: "XS", points: { chest: [78, 86], waist: [66, 74], arm_length: [62, 62], neck: [34, 35] } },
  { label: "S", points: { chest: [86, 94], waist: [74, 82], arm_length: [62, 63], neck: [36, 37] } },
  { label: "M", points: { chest: [94, 102], waist: [82, 90], arm_length: [63, 64], neck: [38, 39] } },
  { label: "L", points: { chest: [102, 110], waist: [90, 98.5], arm_length: [64, 65], neck: [40, 41] } },
  { label: "XL", points: { chest: [110, 118], waist: [98.5, 107.5], arm_length: [65, 65.5], neck: [42, 43] } },
  { label: "XXL", points: { chest: [118, 126], waist: [107.5, 116.5], arm_length: [65.5, 66], neck: [44, 45] } },
  { label: "3XL", points: { chest: [126, 134], waist: [116.5, 125.5], arm_length: [66, 66], neck: [46, 47] } },
];

const HM: SourcedChart[] = [
  {
    brand: "hm", market: "IN", categories: TOPS, name: "H&M India — men's tops, shirts & jackets (Regular)",
    sourceUrl: "https://www2.hm.com/en_in/productpage.1257417001.html", source: "H&M India product page size guide", collectedAt: COLLECTED,
    sizes: [
      { label: "XXS", points: { chest: [74, 78], waist: [62, 66], arm_length: [59, 59], neck: [33, 33] } },
      { label: "XS", points: { chest: [78, 86], waist: [66, 74], arm_length: [59, 59], neck: [34, 35] } },
      { label: "S", points: { chest: [86, 90], waist: [74, 78], arm_length: [59, 60], neck: [36, 36] } },
      { label: "M", points: { chest: [94, 98], waist: [82, 86], arm_length: [60, 61], neck: [38, 38] } },
      { label: "L", points: { chest: [102, 106], waist: [90, 94], arm_length: [61, 62], neck: [40, 40] } },
      { label: "XL", points: { chest: [110, 114], waist: [98.5, 103], arm_length: [62, 62.5], neck: [42, 42] } },
      { label: "XXL", points: { chest: [118, 122], waist: [107.5, 112], arm_length: [62.5, 63], neck: [44, 44] } },
      { label: "3XL", points: { chest: [126, 130], waist: [116.5, 121], arm_length: [63, 63], neck: [46, 46] } },
    ],
    notes: "H&M India's chart leaves gaps between sizes (e.g. chest 90–94 cm falls between S and M).",
  },
  {
    brand: "hm", market: "US", categories: TOPS, name: "H&M US — men's tops, shirts & jackets (Regular)",
    sourceUrl: "https://www2.hm.com/en_us/productpage.1242812003.html", source: "H&M US product page size guide", collectedAt: COLLECTED,
    sizes: hmTopsUsUk,
  },
  {
    brand: "hm", market: "UK_EU", categories: TOPS, name: "H&M UK — men's tops, shirts & jackets (Regular)",
    sourceUrl: "https://www2.hm.com/en_gb/productpage.1257417001.html", source: "H&M UK product page size guide", collectedAt: COLLECTED,
    sizes: hmTopsUsUk,
  },
  ...(["IN", "US", "UK_EU"] as const).map<SourcedChart>((market) => ({
    brand: "hm", market, categories: ["jeans"], name: `H&M ${market === "UK_EU" ? "UK" : market === "IN" ? "India" : "US"} — men's jeans (inch sizes)`,
    sourceUrl: { IN: "https://www2.hm.com/en_in/productpage.1235448032.html", US: "https://www2.hm.com/en_us/productpage.1311674001.html", UK_EU: "https://www2.hm.com/en_gb/productpage.1311674005.html" }[market],
    source: `H&M ${market === "UK_EU" ? "UK" : market === "IN" ? "India" : "US"} product page size guide (inch size conversions)`,
    collectedAt: COLLECTED,
    sizes: hmJeans,
    notes: "Hip = H&M's \"low hip\" measurement. Leg-length rows (L30/L32/L34) are not modelled as sizes.",
  })),
];

// ── helpers ─────────────────────────────────────────────────────────────────
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Inches → cm range (brand published inches; converted exactly, rounded to 0.1 cm). */
const inch = (a: number, b: number = a): Range => [r1(a * 2.54), r1(b * 2.54)];
const cm = (a: number, b: number = a): Range => [a, b];

// ── Levi's ──────────────────────────────────────────────────────────────────
// UK/EU (levi.com/GB, identical to levi.com/DE): cm. US (levi.com/US): inches, waist RANGES differ from EU.
// India: levi.in publishes per-product fit images only — no body chart.
const LEVIS: SourcedChart[] = [
  {
    brand: "levis", market: "UK_EU", categories: ["t-shirts", "shirts", "jackets"], name: "Levi's UK/EU — men's tops & outerwear",
    sourceUrl: "https://www.levi.com/GB/en_GB/info/sizechart", source: "Levi's UK size chart (men's tops & outerwear)", collectedAt: COLLECTED,
    sizes: [
      { label: "XS", points: { neck: cm(37.4, 37.7), chest: cm(81.3, 86.4), waist: cm(66, 71.1) } },
      { label: "S", points: { neck: cm(38.1, 38.7), chest: cm(88.9, 94), waist: cm(73.7, 78.7) } },
      { label: "M", points: { neck: cm(39, 40), chest: cm(96.5, 101.6), waist: cm(81.3, 86.4) } },
      { label: "L", points: { neck: cm(40.9, 41.9), chest: cm(104.1, 109.2), waist: cm(88.9, 94) } },
      { label: "XL", points: { neck: cm(42.8, 43.8), chest: cm(111.8, 116.8), waist: cm(96.5, 101.6) } },
      { label: "XXL", points: { neck: cm(44.7, 45.7), chest: cm(119.4, 124.5), waist: cm(104.1, 109.2) } },
      { label: "3XL", points: { neck: cm(46.6, 47.6), chest: cm(127, 132.1), waist: cm(111.8, 116.8) } },
    ],
  },
  {
    brand: "levis", market: "UK_EU", categories: ["jeans"], name: "Levi's UK/EU — men's bottoms (numeric)",
    sourceUrl: "https://www.levi.com/GB/en_GB/info/sizechart", source: "Levi's UK size chart (men's bottoms, numeric)", collectedAt: COLLECTED,
    notes: "Levi's lists a single body measurement per size (not a range). Hip = Levi's \"seat\".",
    sizes: ([
      [26, 66, 82.5, 49.4], [27, 68.6, 85, 50.8], [28, 71.1, 87.5, 52], [29, 73.7, 90.2, 53.3], [30, 76.2, 92.7, 54.6],
      [31, 78.7, 95.3, 56], [32, 81.3, 97.8, 57.2], [33, 83.8, 100.3, 58.4], [34, 86.4, 103, 59.7], [35, 89, 105.5, 61],
      [36, 91.4, 108, 62.2], [38, 96.5, 113, 64], [40, 101.6, 118, 66.5], [42, 106.7, 123.2, 68.3], [44, 111.8, 128.3, 70.5],
    ] as const).map(([label, w, h, t]) => ({ label: String(label), points: { waist: cm(w), hip: cm(h), thigh: cm(t) } })),
  },
  {
    brand: "levis", market: "US", categories: ["t-shirts", "shirts", "jackets"], name: "Levi's US — men's tops",
    sourceUrl: "https://www.levi.com/US/en_US/info/sizeguide", source: "Levi's US size guide (men's tops, inches)", collectedAt: COLLECTED,
    sizes: [
      { label: "XS", points: { neck: inch(14.75, 14.9), chest: inch(32, 34), waist: inch(26, 28) } },
      { label: "S", points: { neck: inch(15, 15.25), chest: inch(35, 37), waist: inch(29, 31) } },
      { label: "M", points: { neck: inch(15.4, 15.75), chest: inch(38, 40), waist: inch(32, 34) } },
      { label: "L", points: { neck: inch(16.1, 16.5), chest: inch(41, 43), waist: inch(35, 37) } },
      { label: "XL", points: { neck: inch(16.9, 17.25), chest: inch(44, 46), waist: inch(38, 40) } },
      { label: "XXL", points: { neck: inch(17.6, 18), chest: inch(47, 49), waist: inch(41, 43) } },
      { label: "3XL", points: { neck: inch(18.4, 18.75), chest: inch(50, 52), waist: inch(44, 46) } },
    ],
  },
  {
    brand: "levis", market: "US", categories: ["jeans"], name: "Levi's US — men's bottoms",
    sourceUrl: "https://www.levi.com/US/en_US/info/sizeguide", source: "Levi's US size guide (men's bottoms, inches)", collectedAt: COLLECTED,
    notes: "Hip = Levi's \"seat\". Size 33 thigh is printed as 23–24.5 in on the source page.",
    sizes: ([
      [26, 26.5, 27, 32.5, 33, 20.5, 21], [27, 27.5, 28, 33.5, 34, 21, 21.5], [28, 28.5, 29, 34.5, 35, 21.5, 22],
      [29, 29.5, 30, 35.5, 36, 22, 22.5], [30, 30.5, 31, 36.5, 37, 22.5, 23], [31, 31.5, 32, 37.5, 38, 23, 23.5],
      [32, 32.5, 33, 38.5, 39, 23.5, 24], [33, 33.5, 34, 39.5, 40, 23, 24.5], [34, 34.5, 35, 40.5, 41, 24, 25],
      [35, 35.5, 36, 41.5, 42, 25, 26], [36, 36.5, 37.5, 42.5, 43.5, 26, 27], [38, 38.5, 39.5, 44.5, 45.5, 27, 28],
      [40, 40.5, 41.5, 46.5, 47.5, 27.25, 28.25], [42, 42.5, 43.5, 48.5, 49.5, 28, 29], [44, 44.5, 45.5, 50.5, 51.5, 28.75, 29.75],
    ] as const).map(([label, w1, w2, h1, h2, t1, t2]) => ({ label: String(label), points: { waist: inch(w1, w2), hip: inch(h1, h2), thigh: inch(t1, t2) } })),
  },
];

// ── Nike ────────────────────────────────────────────────────────────────────
// nike.com/gb (cm) and nike.com US (inches) publish the same chart. Bottoms chart repeats the
// same waist/hip rows. India (nike.in) exposes no size chart.
const nikeTopsCm: SourcedChart["sizes"] = ([
  ["XXS", 72, 80, 57, 65, 72, 80], ["XS", 80, 88, 65, 73, 80, 88], ["S", 88, 96, 73, 81, 88, 96], ["M", 96, 104, 81, 89, 96, 104],
  ["L", 104, 112, 89, 97, 104, 112], ["XL", 112, 124, 97, 109, 112, 120], ["XXL", 124, 136, 109, 121, 120, 128],
  ["3XL", 136, 148, 121, 133, 128, 136],
] as const).map(([label, c1, c2, w1, w2, h1, h2]) => ({ label, points: { chest: cm(c1, c2), waist: cm(w1, w2), hip: cm(h1, h2) } }));
const nikeTopsIn: SourcedChart["sizes"] = ([
  ["XXS", 28.1, 31.5, 22.5, 25.5, 28.5, 31.5], ["XS", 31.5, 35, 25.5, 29, 31.5, 35], ["S", 35, 37.5, 29, 32, 35, 37.5],
  ["M", 37.5, 41, 32, 35, 37.5, 41], ["L", 41, 44, 35, 38, 41, 44], ["XL", 44, 48.5, 38, 43, 44, 47],
  ["XXL", 48.5, 53.5, 43, 47.5, 47, 50.5], ["3XL", 53.5, 58, 47.5, 52.5, 50.5, 53.5],
] as const).map(([label, c1, c2, w1, w2, h1, h2]) => ({ label, points: { chest: inch(c1, c2), waist: inch(w1, w2), hip: inch(h1, h2) } }));
const NIKE: SourcedChart[] = [
  { brand: "nike", market: "UK_EU", categories: ["t-shirts", "hoodies", "jackets"], name: "Nike UK — men's tops", sourceUrl: "https://www.nike.com/gb/size-fit/mens-tops-alpha", source: "Nike UK men's tops size chart (cm)", collectedAt: COLLECTED, sizes: nikeTopsCm },
  { brand: "nike", market: "UK_EU", categories: ["shorts", "trousers"], name: "Nike UK — men's bottoms", sourceUrl: "https://www.nike.com/gb/size-fit/mens-bottoms-alpha", source: "Nike UK men's bottoms size chart", collectedAt: COLLECTED, sizes: nikeTopsCm.map((s) => ({ label: s.label, points: { waist: s.points.waist, hip: s.points.hip } })) },
  { brand: "nike", market: "US", categories: ["t-shirts", "hoodies", "jackets"], name: "Nike US — men's tops", sourceUrl: "https://www.nike.com/size-fit/mens_tops_alpha", source: "Nike US men's tops size chart (inches)", collectedAt: COLLECTED, sizes: nikeTopsIn },
  { brand: "nike", market: "US", categories: ["shorts", "trousers"], name: "Nike US — men's bottoms", sourceUrl: "https://www.nike.com/size-fit/mens_tops_alpha", source: "Nike US men's size chart (waist & hip rows, inches)", collectedAt: COLLECTED, sizes: nikeTopsIn.map((s) => ({ label: s.label, points: { waist: s.points.waist, hip: s.points.hip } })) },
];

// ── Adidas ──────────────────────────────────────────────────────────────────
// adidas.co.uk and adidas.com/us publish the same cm chart. adidas.co.in/help/size_charts returns 404.
const adidasTops: SourcedChart["sizes"] = ([
  ["XS", 83, 86, 71, 74, 82, 85], ["S", 87, 92, 75, 80, 86, 91], ["M", 93, 100, 81, 88, 92, 99], ["L", 101, 108, 89, 96, 100, 107],
  ["XL", 109, 118, 97, 106, 108, 116], ["2XL", 119, 130, 107, 119, 117, 125], ["3XL", 131, 142, 120, 132, 126, 135],
] as const).map(([label, c1, c2, w1, w2, h1, h2]) => ({ label, points: { chest: cm(c1, c2), waist: cm(w1, w2), hip: cm(h1, h2) } }));
const ADIDAS: SourcedChart[] = [
  { brand: "adidas", market: "UK_EU", categories: ["t-shirts", "hoodies", "jackets"], name: "Adidas UK — men's T-shirts & jackets", sourceUrl: "https://www.adidas.co.uk/help/size_charts", source: "Adidas UK men's size chart (cm)", collectedAt: COLLECTED, sizes: adidasTops },
  { brand: "adidas", market: "US", categories: ["t-shirts", "hoodies", "jackets"], name: "Adidas US — men's T-shirts & jackets", sourceUrl: "https://www.adidas.com/us/help/size_charts", source: "Adidas US men's size chart (cm)", collectedAt: COLLECTED, sizes: adidasTops },
];

// ── Tommy Hilfiger ──────────────────────────────────────────────────────────
// UK: uk.tommy.com/mens-size-guide (cm). US: usa.tommy.com (inches). India not collected.
const tommyUkBottoms = { XXS: [cm(74, 76), cm(84, 86), cm(51, 52)], XS: [cm(77, 81), cm(87, 91), cm(52, 54)], S: [cm(82, 86), cm(92, 97), cm(54, 56)], M: [cm(86, 90), cm(97, 102), cm(56, 58)], L: [cm(91, 96), cm(103, 108), cm(58, 60)], XL: [cm(97, 101), cm(109, 113), cm(60, 62)], XXL: [cm(102, 106), cm(114, 118), cm(62, 64)] } as const;
const tommyBottom = (k: keyof typeof tommyUkBottoms) => ({ waist: tommyUkBottoms[k][0], hip: tommyUkBottoms[k][1], thigh: tommyUkBottoms[k][2] });
const TOMMY: SourcedChart[] = [
  {
    brand: "tommy-hilfiger", market: "UK_EU", categories: ["t-shirts", "polo-t-shirts", "shirts", "jackets"], name: "Tommy Hilfiger UK — men's tops",
    sourceUrl: "https://uk.tommy.com/mens-size-guide", source: "Tommy Hilfiger UK men's size guide (Tommy Hilfiger sizes)", collectedAt: COLLECTED,
    notes: "\"Arms\" on the source is centre-back-to-wrist, stored as sleeve length.",
    sizes: ([
      ["XS", 88, 92, 78, 82, 84, 85, 37, 38], ["S", 93, 97, 83, 87, 86, 87, 38, 39], ["M", 98, 102, 88, 92, 88, 89, 40, 41],
      ["L", 103, 108, 93, 98, 90, 91, 42, 43], ["XL", 109, 114, 99, 104, 92, 93, 44, 45], ["XXL", 115, 120, 105, 110, 94, 95, 45, 46],
      ["3XL", 121, 126, 111, 116, 96, 97, 46, 47],
    ] as const).map(([label, c1, c2, w1, w2, s1, s2, n1, n2]) => ({ label, points: { chest: cm(c1, c2), waist: cm(w1, w2), sleeve: cm(s1, s2), neck: cm(n1, n2) } })),
  },
  {
    brand: "tommy-hilfiger", market: "UK_EU", categories: ["shorts", "trousers"], name: "Tommy Hilfiger UK — men's bottoms (alpha)",
    sourceUrl: "https://uk.tommy.com/mens-size-guide", source: "Tommy Hilfiger UK men's size guide (bottoms)", collectedAt: COLLECTED,
    sizes: (Object.keys(tommyUkBottoms) as (keyof typeof tommyUkBottoms)[]).map((k) => ({ label: k, points: tommyBottom(k) })),
  },
  {
    brand: "tommy-hilfiger", market: "UK_EU", categories: ["jeans"], name: "Tommy Hilfiger UK — men's denim (inch sizes)",
    sourceUrl: "https://uk.tommy.com/mens-size-guide", source: "Tommy Hilfiger UK men's size guide (bottoms, denim inch row)", collectedAt: COLLECTED,
    notes: "Each denim inch size takes the body ranges of the letter size Tommy maps it to (e.g. 29 and 30 both map to XS).",
    sizes: ([["28", "XXS"], ["29", "XS"], ["30", "XS"], ["31", "S"], ["32", "S"], ["33", "M"], ["34", "M"], ["35", "L"], ["36", "L"], ["38", "XL"], ["40", "XXL"]] as const)
      .map(([label, alpha]) => ({ label, points: tommyBottom(alpha) })),
  },
  {
    brand: "tommy-hilfiger", market: "UK_EU", categories: ["formal-wear"], name: "Tommy Hilfiger UK — tailored (regular)",
    sourceUrl: "https://uk.tommy.com/mens-size-guide", source: "Tommy Hilfiger UK men's size guide (tailored)", collectedAt: COLLECTED,
    sizes: ([
      [34, 88, 92, 76, 78, 88, 91, 61, 62], [36, 93, 95, 79, 81, 92, 94, 63, 64], [38, 96, 98, 82, 84, 95, 97, 64, 65], [40, 99, 102, 85, 88, 98, 101, 65, 66],
      [42, 103, 106, 89, 92, 102, 105, 66, 67], [44, 107, 111, 93, 97, 106, 110, 67, 68], [46, 112, 116, 98, 102, 111, 115, 68, 69], [48, 117, 121, 103, 107, 116, 120, 69, 70],
    ] as const).map(([uk, c1, c2, w1, w2, h1, h2, a1, a2]) => ({ label: `${uk}R`, points: { chest: cm(c1, c2), waist: cm(w1, w2), hip: cm(h1, h2), arm_length: cm(a1, a2) } })),
  },
  {
    brand: "tommy-hilfiger", market: "US", categories: ["t-shirts", "polo-t-shirts", "shirts", "jackets"], name: "Tommy Hilfiger US — men's tops",
    sourceUrl: "https://usa.tommy.com/en/size-guide-men.html", source: "Tommy Hilfiger US men's size guide (inches)", collectedAt: COLLECTED,
    notes: "4XL/5XL rows on the source page contain inconsistent single values and were not imported.",
    sizes: ([
      ["XS", 34.6, 36.2, 30.7, 32.2, 33, 33.4, 14.5, 14.9], ["S", 36.6, 38.1, 32.6, 34.2, 33.8, 34.2, 14.9, 15.3], ["M", 38.5, 40.1, 34.6, 36.2, 34.6, 35, 15.7, 16.1],
      ["L", 40.5, 42.5, 36.6, 38.5, 35.4, 35.8, 16.5, 16.9], ["XL", 42.9, 44.8, 38.9, 40.9, 36.2, 36.6, 17.3, 17.7], ["XXL", 45.2, 47.2, 41.3, 43.3, 37, 37.4, 17.7, 18.1],
      ["3XL", 47.6, 49.6, 43.7, 45.6, 37.7, 38.1, 18.1, 18.5],
    ] as const).map(([label, c1, c2, w1, w2, s1, s2, n1, n2]) => ({ label, points: { chest: inch(c1, c2), waist: inch(w1, w2), sleeve: inch(s1, s2), neck: inch(n1, n2) } })),
  },
  {
    brand: "tommy-hilfiger", market: "US", categories: ["jeans", "trousers"], name: "Tommy Hilfiger US — men's bottoms (numeric)",
    sourceUrl: "https://usa.tommy.com/en/size-guide-men.html", source: "Tommy Hilfiger US men's size guide (bottoms, inches)", collectedAt: COLLECTED,
    notes: "Single body measurement per size on the source page.",
    sizes: ([
      [28, 29.5, 35.5, 20.5], [29, 30.5, 36.5, 21.25], [30, 31.5, 37.5, 22], [31, 32.5, 38.5, 22.5], [32, 33.5, 39.5, 23.25], [33, 34.5, 40.5, 23.75],
      [34, 35.5, 41.5, 24.5], [35, 36.5, 42.5, 25], [36, 37.5, 43.5, 25.75], [38, 39.5, 45.5, 27], [40, 41.5, 47.5, 28.25], [42, 43.5, 49.5, 29.5], [44, 45.5, 51.5, 30.75],
    ] as const).map(([label, w, h, t]) => ({ label: String(label), points: { waist: inch(w), hip: inch(h), thigh: inch(t) } })),
  },
];

// ── U.S. Polo Assn. ─────────────────────────────────────────────────────────
// US site publishes GARMENT measurements (finished shirt), UK publishes BODY measurements,
// India shows one site-wide garment table on every product page (tops only).
const USPA: SourcedChart[] = [
  {
    brand: "us-polo-assn", market: "US", categories: ["polo-t-shirts"], name: "U.S. Polo Assn. US — Classic Fit Polo (garment)",
    sourceUrl: "https://uspoloassn.com/pages/size-guide-mens-tops", source: "U.S. Polo Assn. US men's tops size guide — Classic Fit Polo (garment, inches)", collectedAt: COLLECTED,
    basis: "garment",
    sizes: ([["XS", 39, 15.5], ["S", 41, 16.5], ["M", 44, 17.5], ["L", 48, 18.5], ["XL", 52, 19.5], ["XXL", 55, 20.5]] as const).map(([label, c, s]) => ({ label, points: { chest: inch(c), shoulder: inch(s) } })),
  },
  {
    brand: "us-polo-assn", market: "US", categories: ["t-shirts"], name: "U.S. Polo Assn. US — Classic Fit Tees (garment)",
    sourceUrl: "https://uspoloassn.com/pages/size-guide-mens-tops", source: "U.S. Polo Assn. US men's tops size guide — Classic Fit Tees (garment, inches)", collectedAt: COLLECTED,
    basis: "garment",
    sizes: ([["XS", 38, 16], ["S", 40, 16.75], ["M", 44, 17.75], ["L", 46, 18.5], ["XL", 51, 19.75], ["XXL", 54, 20.75]] as const).map(([label, c, s]) => ({ label, points: { chest: inch(c), shoulder: inch(s) } })),
  },
  {
    brand: "us-polo-assn", market: "US", categories: ["shirts"], name: "U.S. Polo Assn. US — sport shirts (garment)",
    sourceUrl: "https://uspoloassn.com/pages/size-guide-mens-tops", source: "U.S. Polo Assn. US men's tops size guide — sport shirts (garment, inches)", collectedAt: COLLECTED,
    basis: "garment",
    notes: "XXL sleeve is printed as \"37 /12\" on the source; stored as 37.5 in.",
    sizes: ([["S", 44.5, 40, 15.75, 34.5], ["M", 47.5, 43, 16.75, 35.25], ["L", 50.5, 46, 17.75, 36], ["XL", 53.5, 49, 18.75, 36.75], ["XXL", 56.5, 52, 19.75, 37.5]] as const)
      .map(([label, c, w, n, s]) => ({ label, points: { chest: inch(c), waist: inch(w), neck: inch(n), sleeve: inch(s) } })),
  },
  {
    brand: "us-polo-assn", market: "US", categories: ["shorts"], name: "U.S. Polo Assn. US — men's bottoms",
    sourceUrl: "https://uspoloassn.com/pages/size-guide-mens-bottoms", source: "U.S. Polo Assn. US men's bottoms size guide (inches)", collectedAt: COLLECTED,
    sizes: ([["XS", 28, 29], ["S", 30, 31], ["M", 32, 34], ["L", 35, 37], ["XL", 38, 40], ["XXL", 41, 43]] as const).map(([label, a, b]) => ({ label, points: { waist: inch(a, b) } })),
  },
  {
    brand: "us-polo-assn", market: "UK_EU", categories: ["t-shirts", "polo-t-shirts", "shirts"], name: "U.S. Polo Assn. UK — men's tops",
    sourceUrl: "https://www.uspoloassn.co.uk/pages/size-guide", source: "U.S. Polo Assn. UK size guide (men's tops)", collectedAt: COLLECTED,
    notes: "\"Arm length (long)\" on the source (84.5–94 cm) is centre-back-to-wrist, stored as sleeve length.",
    sizes: ([
      ["XS", 86, 91, 71, 76, 84.5, 37], ["S", 91, 97, 76, 81, 85, 38], ["M", 97, 102, 81, 86, 86, 39.5], ["L", 102, 107, 86, 91, 86.7, 40.5],
      ["XL", 107, 112, 91, 97, 87.5, 42], ["2XL", 112, 117, 97, 102, 89, 43], ["3XL", 117, 127, 102, 107, 91, 44.5],
    ] as const).map(([label, c1, c2, w1, w2, s, n]) => ({ label, points: { chest: cm(c1, c2), waist: cm(w1, w2), sleeve: cm(s), neck: cm(n) } })),
  },
  {
    brand: "us-polo-assn", market: "UK_EU", categories: ["jeans"], name: "U.S. Polo Assn. UK — men's bottoms (waist sizes)",
    sourceUrl: "https://www.uspoloassn.co.uk/pages/size-guide", source: "U.S. Polo Assn. UK size guide (men's bottoms)", collectedAt: COLLECTED,
    notes: "Fixed-waist measurement; hip = seat.",
    sizes: ([[28, 71, 88, 90], [30, 76, 93, 95], [32, 81, 98, 100], [34, 86, 103, 105], [36, 91, 108, 110], [38, 97, 113, 115], [40, 102, 118, 120], [42, 107, 123, 125], [44, 112, 128, 130]] as const)
      .map(([label, w, h1, h2]) => ({ label: String(label), points: { waist: cm(w), hip: cm(h1, h2) } })),
  },
  {
    brand: "us-polo-assn", market: "UK_EU", categories: ["shorts"], name: "U.S. Polo Assn. UK — men's elasticated bottoms",
    sourceUrl: "https://www.uspoloassn.co.uk/pages/size-guide", source: "U.S. Polo Assn. UK size guide (men's bottoms, elasticated waist)", collectedAt: COLLECTED,
    sizes: ([["XS", 71, 76, 88, 90], ["S", 76, 81, 93, 95], ["M", 81, 86, 98, 100], ["L", 86, 91, 103, 105], ["XL", 91, 97, 108, 110], ["2XL", 97, 102, 113, 115], ["3XL", 102, 107, 118, 120]] as const)
      .map(([label, w1, w2, h1, h2]) => ({ label, points: { waist: cm(w1, w2), hip: cm(h1, h2) } })),
  },
  {
    brand: "us-polo-assn", market: "IN", categories: ["t-shirts", "polo-t-shirts", "shirts"], name: "U.S. Polo Assn. India — men's tops (garment)",
    sourceUrl: "https://uspoloassn.in/products/menswear-brand-embroidered-slim-fit-polo-shirt-reda8nkxmof", source: "U.S. Polo Assn. India product page size chart (garment, cm)", collectedAt: COLLECTED,
    basis: "garment",
    notes: "The same table appears on every USPA India product page (including bottoms), so it is treated as a general tops garment chart, not product-specific.",
    sizes: ([["XS", 40.6, 96.5, 71.1], ["S", 43.2, 100, 73.7], ["M", 45.7, 105, 74.9], ["L", 48.3, 114, 78.7], ["XL", 50.8, 121, 80], ["XXL", 53.3, 127, 81.3], ["3XL", 55.9, 133, 82.5]] as const)
      .map(([label, s, c, l]) => ({ label, points: { shoulder: cm(s), chest: cm(c), body_length: cm(l) } })),
  },
];

// ── COS ─────────────────────────────────────────────────────────────────────
// Men's size guide on product pages. Each letter size spans two EU sizes (XS = EU 40–42).
// COS does not sell in India.
const cosRows = [["XS", 80, 84, 68, 72, 61.5, 62, 33, 34.3], ["S", 88, 92, 76, 80, 62.5, 63, 35.6, 36.8], ["M", 96, 100, 84, 88, 63.5, 64, 38.1, 39.4], ["L", 104, 108, 92, 96, 64.5, 65, 40.6, 41.9], ["XL", 112, 116, 100, 104, 65.5, 66, 43.2, 44.5]] as const;
const COS: SourcedChart[] = [
  {
    brand: "cos", market: "UK_EU", categories: ["t-shirts", "shirts", "jackets"], name: "COS UK — men's tops", collectedAt: COLLECTED,
    sourceUrl: "https://www.cos.com/en-gb/men/menswear/tshirts/slim-fit/product/slim-ribbed-cotton-long-sleeved-henley-t-shirt-chocolate-1333150007", source: "COS UK product page size guide (men)",
    sizes: cosRows.map(([label, c1, c2, w1, w2, a1, a2]) => ({ label, points: { chest: cm(c1, c2), waist: cm(w1, w2), arm_length: cm(a1, a2) } })),
  },
  {
    brand: "cos", market: "US", categories: ["t-shirts", "shirts", "jackets"], name: "COS US — men's tops", collectedAt: COLLECTED,
    sourceUrl: "https://www.cos.com/en-us/men/menswear/tshirts/slim-fit/product/slim-ribbed-cotton-long-sleeved-henley-t-shirt-chocolate-1333150007", source: "COS US product page size guide (men, cm)",
    sizes: cosRows.map(([label, c1, c2, w1, w2, a1, a2, n1, n2]) => ({ label, points: { chest: cm(c1, c2), waist: cm(w1, w2), arm_length: cm(a1, a2), neck: cm(n1, n2) } })),
  },
];

// ── Mango ───────────────────────────────────────────────────────────────────
// shop.mango.com size guide, Man line. GB and US identical; India shows the general men's table.
const mangoShirts = ([["XS", 36.6, 96, 76], ["S", 37.8, 100, 80], ["M", 39, 104, 84], ["L", 40.2, 110, 90], ["XL", 41.4, 116, 96], ["XXL", 42.6, 120, 100]] as const)
  .map(([label, n, c, w]) => ({ label, points: { neck: cm(n), chest: cm(c), waist: cm(w) } }));
const mangoTees = mangoShirts.map((s) => ({ label: s.label, points: { chest: s.points.chest, waist: s.points.waist } }));
const mangoJeans = ([[29, 72, 86], [30, 76, 90], [31, 80, 94], [32, 84, 98], [34, 88, 102], [36, 92, 106], [38, 96, 110]] as const)
  .map(([label, w, h]) => ({ label: String(label), points: { waist: cm(w), hip: cm(h) } }));
const MANGO: SourcedChart[] = [
  ...(["UK_EU", "US"] as const).flatMap<SourcedChart>((market) => {
    const where = market === "US" ? "US" : "UK";
    const url = `https://shop.mango.com/${market === "US" ? "us" : "gb"}/en/size-guide`;
    const note = "Mango lists a single body measurement per size.";
    return [
      { brand: "mango", market, categories: ["shirts", "formal-wear"], name: `Mango ${where} — men's shirts`, sourceUrl: url, source: `Mango ${where} size guide (Man › Shirts)`, collectedAt: COLLECTED, notes: note, sizes: mangoShirts },
      { brand: "mango", market, categories: ["t-shirts", "jackets"], name: `Mango ${where} — men's T-shirts`, sourceUrl: url, source: `Mango ${where} size guide (Man › T-shirts)`, collectedAt: COLLECTED, notes: note, sizes: mangoTees },
      { brand: "mango", market, categories: ["jeans"], name: `Mango ${where} — men's jeans`, sourceUrl: url, source: `Mango ${where} size guide (Man › Jeans)`, collectedAt: COLLECTED, notes: note, sizes: mangoJeans },
    ];
  }),
  {
    brand: "mango", market: "IN", categories: ["t-shirts", "shirts", "jackets", "formal-wear"], name: "Mango India — men's garments",
    sourceUrl: "https://shop.mango.com/in/en/size-guide", source: "Mango India size guide (Man)", collectedAt: COLLECTED, notes: "Mango lists a single body measurement per size.",
    sizes: ([["XS", 96, 76, 90], ["S", 100, 80, 94], ["M", 104, 84, 98], ["L", 110, 90, 104], ["XL", 116, 96, 110], ["XXL", 120, 100, 114]] as const)
      .map(([label, c, w, h]) => ({ label, points: { chest: cm(c), waist: cm(w), hip: cm(h) } })),
  },
];

export const SOURCED_CHARTS: SourcedChart[] = [...HM, ...LEVIS, ...NIKE, ...ADIDAS, ...TOMMY, ...USPA, ...COS, ...MANGO];

/** Brand × market combinations checked where no general body chart is published. */
export const NOT_PUBLISHED: { brand: string; market: Market; reason: string }[] = [
  { brand: "levis", market: "IN", reason: "levi.in shows per-product fit images only." },
  { brand: "nike", market: "IN", reason: "nike.in exposes no size chart pages." },
  { brand: "adidas", market: "IN", reason: "adidas.co.in size chart page returns 404." },
  { brand: "cos", market: "IN", reason: "COS does not sell in India." },
  { brand: "zara", market: "IN", reason: "Zara publishes per-product garment measurements only." },
  { brand: "zara", market: "US", reason: "Zara publishes per-product garment measurements only." },
  { brand: "zara", market: "UK_EU", reason: "Zara publishes per-product garment measurements only." },
  { brand: "uniqlo", market: "IN", reason: "Uniqlo's body chart is inside an interactive product tool; only per-product garment charts are readable." },
  { brand: "uniqlo", market: "US", reason: "Uniqlo's body chart is inside an interactive product tool; only per-product garment charts are readable." },
  { brand: "uniqlo", market: "UK_EU", reason: "Uniqlo's body chart is inside an interactive product tool; only per-product garment charts are readable." },
  { brand: "tommy-hilfiger", market: "IN", reason: "Not collected: no Tommy Hilfiger India size guide was found." },
];
