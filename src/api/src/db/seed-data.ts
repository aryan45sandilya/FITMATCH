/**
 * FitMatch demonstration dataset.
 *
 * IMPORTANT: the size charts and garment measurements below are APPROXIMATIONS
 * generated for demonstration. They are NOT copied from, or endorsed by, the brands.
 * Every chart is stored with is_demo = true and verification_status = 'unverified',
 * and the UI labels it accordingly. Replace with sourced data via the admin panel.
 */
import type { BodyKey, Fit, Stretch } from "../engine/types.js";

export const DEMO_SOURCE = "FitMatch demonstration dataset (approximated; not the brand's published chart)";
export const DEMO_COLLECTED_AT = "2026-10-01";

export const MEASUREMENT_POINTS: {
  key: string;
  label: string;
  region: "upper" | "lower" | "overall";
  description: string;
  how: string;
  min: number;
  max: number;
}[] = [
  { key: "chest", label: "Chest", region: "upper", description: "Fullest part of the chest.", how: "Wrap the tape under your arms, around the fullest part of your chest, keeping it level across your back. Breathe normally.", min: 60, max: 170 },
  { key: "shoulder", label: "Shoulder width", region: "upper", description: "Across the back, shoulder point to shoulder point.", how: "Measure across your upper back from the edge of one shoulder bone to the other, following the natural curve.", min: 30, max: 65 },
  { key: "neck", label: "Neck", region: "upper", description: "Around the base of the neck.", how: "Measure around the base of your neck where a shirt collar sits. Keep one finger under the tape for comfort.", min: 28, max: 55 },
  { key: "sleeve", label: "Sleeve length", region: "upper", description: "Centre-back neck to wrist.", how: "With your arm relaxed and slightly bent, measure from the centre of the back of your neck, over the shoulder, down to the wrist bone.", min: 65, max: 100 },
  { key: "bicep", label: "Bicep", region: "upper", description: "Fullest part of the upper arm.", how: "With your arm relaxed at your side, wrap the tape around the fullest part of your upper arm.", min: 20, max: 60 },
  { key: "arm_length", label: "Arm length", region: "upper", description: "Shoulder point to wrist.", how: "From the outer edge of your shoulder bone, measure down the outside of your arm to the wrist bone.", min: 40, max: 80 },
  { key: "waist", label: "Waist", region: "lower", description: "Where your trousers sit.", how: "Measure around your waist at the height you usually wear your trousers — typically just above the hip bones. Keep the tape snug, not tight.", min: 50, max: 160 },
  { key: "hip", label: "Hips", region: "lower", description: "Fullest part of the hips and seat.", how: "Stand with feet together and measure around the fullest part of your hips and seat.", min: 65, max: 170 },
  { key: "thigh", label: "Thigh", region: "lower", description: "Fullest part of the upper thigh.", how: "Measure around the fullest part of one thigh, just below the crotch.", min: 35, max: 95 },
  { key: "inseam", label: "Inseam", region: "lower", description: "Crotch to ankle, inside leg.", how: "Measure from the crotch seam down the inside of the leg to just above the ankle bone. Easiest using a pair of well-fitting trousers.", min: 55, max: 100 },
  { key: "outseam", label: "Outseam", region: "lower", description: "Waist to ankle, outside leg.", how: "Measure from your natural waist down the outside of your leg to just above the ankle bone.", min: 80, max: 130 },
  { key: "calf", label: "Calf", region: "lower", description: "Fullest part of the calf.", how: "Measure around the fullest part of your calf while standing.", min: 25, max: 60 },
  { key: "body_length", label: "Body length", region: "overall", description: "Garment only: high-point shoulder to hem.", how: "Garment measurement — from the highest point of the shoulder seam down to the hem.", min: 30, max: 130 },
];

export const CATEGORIES: {
  slug: string;
  name: string;
  group: "top" | "bottom" | "outerwear" | "formal";
  required: BodyKey[];
  weights: Partial<Record<BodyKey, number>>;
}[] = [
  { slug: "t-shirts", name: "T-Shirts", group: "top", required: ["chest"], weights: { chest: 0.5, shoulder: 0.3, waist: 0.2 } },
  { slug: "polo-t-shirts", name: "Polo T-Shirts", group: "top", required: ["chest"], weights: { chest: 0.5, shoulder: 0.3, waist: 0.2 } },
  { slug: "shirts", name: "Shirts", group: "top", required: ["chest", "neck"], weights: { chest: 0.35, neck: 0.2, shoulder: 0.2, sleeve: 0.15, waist: 0.1 } },
  { slug: "jeans", name: "Jeans", group: "bottom", required: ["waist", "hip"], weights: { waist: 0.4, hip: 0.3, thigh: 0.15, inseam: 0.15 } },
  { slug: "trousers", name: "Trousers", group: "bottom", required: ["waist", "hip"], weights: { waist: 0.45, hip: 0.3, inseam: 0.15, thigh: 0.1 } },
  { slug: "jackets", name: "Jackets", group: "outerwear", required: ["chest"], weights: { chest: 0.45, shoulder: 0.3, arm_length: 0.15, waist: 0.1 } },
  { slug: "hoodies", name: "Hoodies", group: "top", required: ["chest"], weights: { chest: 0.5, shoulder: 0.25, arm_length: 0.15, waist: 0.1 } },
  { slug: "shorts", name: "Shorts", group: "bottom", required: ["waist"], weights: { waist: 0.55, hip: 0.35, thigh: 0.1 } },
  { slug: "formal-wear", name: "Formal Wear", group: "formal", required: ["chest", "waist"], weights: { chest: 0.4, shoulder: 0.25, waist: 0.15, arm_length: 0.1, neck: 0.1 } },
];

interface BrandSpec {
  slug: string;
  name: string;
  country: string;
  website: string;
  description: string;
  sizingNotes: string;
  /** cm offset applied to circumference ranges for letter sizes */
  offset: number;
  /** cm step between letter sizes */
  step: number;
  bottomOffset: number;
  categories: string[];
  formalLabels?: "us" | "eu";
}

export const BRANDS: BrandSpec[] = [
  { slug: "hm", name: "H&M", country: "Sweden", website: "https://www2.hm.com", description: "Swedish fast-fashion retailer with a broad, trend-led range.", sizingNotes: "Demo profile: true to size in regular fits, slim fits run snug.", offset: 0, step: 8, bottomOffset: 0, categories: ["t-shirts", "shirts", "jeans", "trousers", "hoodies", "jackets", "shorts", "formal-wear"], formalLabels: "eu" },
  { slug: "zara", name: "Zara", country: "Spain", website: "https://www.zara.com", description: "Spanish fashion house known for fast, editorial collections.", sizingNotes: "Demo profile: narrower size ranges; many shoppers size up.", offset: -2, step: 7, bottomOffset: -2, categories: ["t-shirts", "shirts", "jeans", "trousers", "jackets", "hoodies", "formal-wear"], formalLabels: "eu" },
  { slug: "us-polo-assn", name: "U.S. Polo Assn.", country: "United States", website: "https://uspoloassn.com", description: "American heritage sportswear centred on polos and casual shirts.", sizingNotes: "Demo profile: generous, classic American cut.", offset: 2, step: 8, bottomOffset: 1, categories: ["t-shirts", "polo-t-shirts", "shirts", "jeans", "shorts"] },
  { slug: "uniqlo", name: "Uniqlo", country: "Japan", website: "https://www.uniqlo.com", description: "Japanese essentials brand focused on fabric technology.", sizingNotes: "Demo profile: compact sizing; trousers labelled by waist in cm.", offset: -2, step: 7, bottomOffset: 0, categories: ["t-shirts", "polo-t-shirts", "shirts", "trousers", "jackets", "hoodies", "shorts"] },
  { slug: "levis", name: "Levi's", country: "United States", website: "https://www.levi.com", description: "Denim heritage brand with waist-and-length sizing.", sizingNotes: "Demo profile: waist labels track body waist closely.", offset: 1, step: 8, bottomOffset: 0, categories: ["jeans", "t-shirts", "jackets", "shirts"] },
  { slug: "tommy-hilfiger", name: "Tommy Hilfiger", country: "United States", website: "https://usa.tommy.com", description: "Preppy American classics with a tailored edge.", sizingNotes: "Demo profile: roomy regular fits, true-to-size slim fits.", offset: 2, step: 8, bottomOffset: 1, categories: ["polo-t-shirts", "shirts", "t-shirts", "jeans", "jackets", "formal-wear"], formalLabels: "us" },
  { slug: "nike", name: "Nike", country: "United States", website: "https://www.nike.com", description: "Performance sportswear and athletic apparel.", sizingNotes: "Demo profile: athletic cuts, stretch fabrics.", offset: 1, step: 8, bottomOffset: 0, categories: ["t-shirts", "hoodies", "shorts", "jackets"] },
  { slug: "adidas", name: "Adidas", country: "Germany", website: "https://www.adidas.com", description: "German sportswear with performance and lifestyle lines.", sizingNotes: "Demo profile: true to size across most categories.", offset: 0, step: 8, bottomOffset: 0, categories: ["t-shirts", "hoodies", "shorts", "jackets", "trousers"] },
  { slug: "mango", name: "Mango", country: "Spain", website: "https://shop.mango.com", description: "Mediterranean-inspired contemporary fashion.", sizingNotes: "Demo profile: fitted tailoring, slightly small tops.", offset: -2, step: 7, bottomOffset: -1, categories: ["shirts", "trousers", "jackets", "formal-wear", "t-shirts"], formalLabels: "eu" },
  { slug: "cos", name: "COS", country: "United Kingdom", website: "https://www.cos.com", description: "Modern, functional and considered design.", sizingNotes: "Demo profile: relaxed proportions, generous through the body.", offset: 1, step: 8, bottomOffset: 1, categories: ["t-shirts", "shirts", "trousers", "jackets"] },
];

export const LETTERS = ["XS", "S", "M", "L", "XL", "XXL"];
export const WAIST_LABELS = [28, 29, 30, 31, 32, 33, 34, 36, 38];
export const UNIQLO_WAIST_CM = [73, 76, 79, 82, 85, 88, 91, 94];

export interface GenSize {
  label: string;
  sortOrder: number;
  index: number;
  points: Partial<Record<BodyKey, { min: number; max: number }>>;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const range = (min: number, max: number) => ({ min: r1(min), max: r1(max) });

/** Body-measurement size chart for a brand + category (menswear demo). */
export function chartFor(brand: BrandSpec, category: string): GenSize[] {
  const { offset, step } = brand;
  const letter = (fn: (i: number) => GenSize["points"]): GenSize[] =>
    LETTERS.map((label, i) => ({ label, sortOrder: i, index: i, points: fn(i) }));

  switch (category) {
    case "t-shirts":
    case "polo-t-shirts":
    case "hoodies":
    case "jackets":
      return letter((i) => ({
        chest: range(80 + offset + i * step, 80 + offset + (i + 1) * step - 1),
        waist: range(66 + offset + i * step, 66 + offset + (i + 1) * step - 1),
      }));
    case "shirts":
      return letter((i) => ({
        chest: range(80 + offset + i * step, 80 + offset + (i + 1) * step - 1),
        waist: range(66 + offset + i * step, 66 + offset + (i + 1) * step - 1),
        neck: range(35 + i * 2, 36 + i * 2),
        sleeve: range(82 + i * 1.5, 83 + i * 1.5),
      }));
    case "shorts":
      return letter((i) => ({
        waist: range(68 + brand.bottomOffset + i * step, 68 + brand.bottomOffset + (i + 1) * step - 1),
        hip: range(84 + brand.bottomOffset + i * step, 84 + brand.bottomOffset + (i + 1) * step - 1),
      }));
    case "jeans":
    case "trousers": {
      if (brand.slug === "uniqlo") {
        return UNIQLO_WAIST_CM.map((w, i) => ({
          label: String(w),
          sortOrder: i,
          index: i,
          points: { waist: range(w - 1.5, w + 1.5), hip: range(w + 16, w + 21) },
        }));
      }
      return WAIST_LABELS.map((w, i) => {
        const mid = w * 2.54 + 1 + brand.bottomOffset;
        return { label: String(w), sortOrder: i, index: i, points: { waist: range(mid - 1.5, mid + 1.5), hip: range(mid + 16, mid + 21) } };
      });
    }
    case "formal-wear": {
      const chestIn = [36, 38, 40, 42, 44, 46, 48];
      return chestIn.map((c, i) => {
        const chestCm = c * 2.54 + offset * 0.5;
        const label = brand.formalLabels === "eu" ? String(c + 10) : `${c}R`;
        return {
          label,
          sortOrder: i,
          index: i,
          points: { chest: range(chestCm - 2.5, chestCm + 2.5), waist: range((c - 6) * 2.54 - 3, (c - 6) * 2.54 + 3) },
        };
      });
    }
    default:
      return [];
  }
}

export interface ProductSpec {
  brand: string;
  category: string;
  slug: string;
  name: string;
  description: string;
  fit: Fit;
  stretch: Stretch;
  fabric: string;
  price: number;
  colorway: string;
  /** Include garment measurements (otherwise only the brand chart applies). */
  garment: boolean;
  /** cm bias applied to circumferences — simulates a product that runs small/large. */
  bias?: number;
}

export const PRODUCTS: ProductSpec[] = [
  { brand: "hm", category: "t-shirts", slug: "hm-regular-fit-cotton-tee", name: "Regular Fit Cotton T-shirt", description: "Crew-neck T-shirt in soft cotton jersey with a straight, easy cut.", fit: "regular", stretch: "low", fabric: "100% cotton jersey", price: 12.99, colorway: "#E9E4DA", garment: true },
  { brand: "hm", category: "hoodies", slug: "hm-relaxed-fit-hoodie", name: "Relaxed Fit Hoodie", description: "Brushed-back sweatshirt hoodie with dropped shoulders and a kangaroo pocket.", fit: "relaxed", stretch: "low", fabric: "80% cotton, 20% polyester", price: 29.99, colorway: "#8C8577", garment: true },
  { brand: "hm", category: "shirts", slug: "hm-slim-fit-oxford-shirt", name: "Slim Fit Oxford Shirt", description: "Oxford-weave cotton shirt with a button-down collar and tapered body.", fit: "slim", stretch: "none", fabric: "100% cotton oxford", price: 24.99, colorway: "#C9D2D9", garment: true },
  { brand: "hm", category: "jeans", slug: "hm-regular-tapered-jeans", name: "Regular Tapered Jeans", description: "Five-pocket jeans in washed stretch denim with a regular seat and tapered leg.", fit: "regular", stretch: "medium", fabric: "98% cotton, 2% elastane", price: 34.99, colorway: "#4A5868", garment: false },
  { brand: "zara", category: "t-shirts", slug: "zara-boxy-heavyweight-tee", name: "Boxy Fit Heavyweight T-shirt", description: "Heavyweight cotton T-shirt with a boxy body, dropped shoulders and ribbed neck.", fit: "oversized", stretch: "none", fabric: "100% cotton, 240 gsm", price: 25.9, colorway: "#2B2A27", garment: true },
  { brand: "zara", category: "shirts", slug: "zara-textured-slim-shirt", name: "Textured Slim Shirt", description: "Slim shirt in a subtle textured weave with a cutaway collar.", fit: "slim", stretch: "low", fabric: "97% cotton, 3% elastane", price: 45.9, colorway: "#F1EEE7", garment: true, bias: -2 },
  { brand: "zara", category: "jeans", slug: "zara-straight-fit-jeans", name: "Straight Fit Jeans", description: "Rigid-look straight jeans with a mid rise and clean finish.", fit: "regular", stretch: "low", fabric: "99% cotton, 1% elastane", price: 49.9, colorway: "#6E7F92", garment: true },
  { brand: "zara", category: "formal-wear", slug: "zara-wool-blend-blazer", name: "Wool Blend Blazer", description: "Single-breasted blazer with notch lapels and a lightly structured shoulder.", fit: "slim", stretch: "low", fabric: "60% wool, 40% polyester", price: 129, colorway: "#3B3A36", garment: false },
  { brand: "us-polo-assn", category: "polo-t-shirts", slug: "uspa-classic-pique-polo", name: "Classic Piqué Polo", description: "Two-button piqué polo with ribbed collar and cuffs.", fit: "regular", stretch: "low", fabric: "100% cotton piqué", price: 29.5, colorway: "#22324A", garment: true },
  { brand: "us-polo-assn", category: "shirts", slug: "uspa-oxford-button-down", name: "Oxford Button-Down Shirt", description: "Classic oxford shirt with button-down collar and chest pocket.", fit: "regular", stretch: "none", fabric: "100% cotton", price: 39.5, colorway: "#DCE3EA", garment: false },
  { brand: "us-polo-assn", category: "shorts", slug: "uspa-twill-chino-shorts", name: "Twill Chino Shorts", description: "Flat-front chino shorts in garment-washed cotton twill.", fit: "regular", stretch: "low", fabric: "98% cotton, 2% elastane", price: 34.5, colorway: "#C2B191", garment: true },
  { brand: "uniqlo", category: "t-shirts", slug: "uniqlo-supima-crew-tee", name: "Supima Cotton Crew T-shirt", description: "Long-staple cotton crew-neck with a smooth, refined finish.", fit: "regular", stretch: "low", fabric: "100% Supima cotton", price: 14.9, colorway: "#FAFAF7", garment: true },
  { brand: "uniqlo", category: "polo-t-shirts", slug: "uniqlo-dry-pique-polo", name: "Dry Piqué Polo", description: "Quick-drying piqué polo with a clean placket.", fit: "regular", stretch: "medium", fabric: "Polyester-cotton blend", price: 24.9, colorway: "#5F6B57", garment: true },
  { brand: "uniqlo", category: "trousers", slug: "uniqlo-smart-ankle-trousers", name: "Smart Ankle Trousers", description: "Ankle-length trousers with two-way stretch and an easy waistband.", fit: "slim", stretch: "high", fabric: "Polyester, rayon, elastane", price: 49.9, colorway: "#3A3F44", garment: true },
  { brand: "uniqlo", category: "hoodies", slug: "uniqlo-sweat-pullover-hoodie", name: "Sweat Pullover Hoodie", description: "Midweight pullover hoodie with a double-layer hood.", fit: "regular", stretch: "low", fabric: "Cotton-polyester fleece", price: 39.9, colorway: "#B9B2A6", garment: false },
  { brand: "levis", category: "jeans", slug: "levis-slim-taper-stretch-jeans", name: "Slim Taper Stretch Jeans", description: "Slim through the thigh with a tapered leg, in flexible stretch denim.", fit: "slim", stretch: "medium", fabric: "99% cotton, 1% elastane", price: 69.5, colorway: "#33475E", garment: true },
  { brand: "levis", category: "jeans", slug: "levis-original-straight-jeans", name: "Original Straight Jeans", description: "Button-fly straight jeans in rigid denim that softens with wear.", fit: "regular", stretch: "none", fabric: "100% cotton denim", price: 79.5, colorway: "#5B7190", garment: true },
  { brand: "levis", category: "jackets", slug: "levis-classic-denim-trucker", name: "Classic Denim Trucker Jacket", description: "Point-collar denim jacket with chest pockets and a waist-length hem.", fit: "regular", stretch: "none", fabric: "100% cotton denim", price: 98, colorway: "#7C93AE", garment: true },
  { brand: "tommy-hilfiger", category: "polo-t-shirts", slug: "tommy-slim-fit-stretch-polo", name: "Slim Fit Stretch Polo", description: "Close-fitting stretch-piqué polo with tipped collar.", fit: "slim", stretch: "medium", fabric: "95% cotton, 5% elastane", price: 69.5, colorway: "#F4F1EA", garment: true },
  { brand: "tommy-hilfiger", category: "shirts", slug: "tommy-regular-poplin-shirt", name: "Regular Fit Poplin Shirt", description: "Crisp cotton poplin shirt with a spread collar.", fit: "regular", stretch: "low", fabric: "100% cotton poplin", price: 89.5, colorway: "#E6EBF0", garment: false },
  { brand: "tommy-hilfiger", category: "jackets", slug: "tommy-padded-puffer-jacket", name: "Padded Puffer Jacket", description: "Quilted puffer jacket with recycled insulation and a stand collar.", fit: "relaxed", stretch: "none", fabric: "Recycled polyester shell", price: 249, colorway: "#1F2A36", garment: true },
  { brand: "nike", category: "t-shirts", slug: "nike-performance-training-tee", name: "Performance Training T-shirt", description: "Sweat-wicking stretch tee cut for movement.", fit: "regular", stretch: "high", fabric: "Recycled polyester, elastane", price: 35, colorway: "#1E1E1C", garment: true },
  { brand: "nike", category: "hoodies", slug: "nike-fleece-pullover-hoodie", name: "Fleece Pullover Hoodie", description: "Brushed fleece hoodie with ribbed cuffs and hem.", fit: "regular", stretch: "low", fabric: "Cotton-polyester fleece", price: 65, colorway: "#6D6A63", garment: true },
  { brand: "nike", category: "trousers", slug: "nike-tech-knit-joggers", name: "Tech Knit Joggers", description: "Tapered knit joggers with zip pockets. (No sizing data on file — demonstrates the insufficient-data state.)", fit: "slim", stretch: "high", fabric: "Cotton-polyester knit", price: 110, colorway: "#2F302E", garment: false },
  { brand: "adidas", category: "jackets", slug: "adidas-classic-track-jacket", name: "Classic Track Jacket", description: "Full-zip track jacket in smooth tricot with a stand collar.", fit: "regular", stretch: "medium", fabric: "100% recycled polyester tricot", price: 80, colorway: "#14213D", garment: false },
  { brand: "adidas", category: "shorts", slug: "adidas-training-shorts", name: "Training Shorts", description: "Lightweight stretch training shorts with an elastic waist.", fit: "regular", stretch: "high", fabric: "Recycled polyester, elastane", price: 35, colorway: "#3D3D3A", garment: true },
  { brand: "mango", category: "shirts", slug: "mango-slim-fit-linen-shirt", name: "Slim Fit Linen Shirt", description: "Breathable linen shirt with a slim body and Kent collar.", fit: "slim", stretch: "none", fabric: "100% linen", price: 59.99, colorway: "#E3DACB", garment: true },
  { brand: "mango", category: "formal-wear", slug: "mango-tailored-suit-blazer", name: "Tailored Suit Blazer", description: "Slim tailored blazer with a soft canvas and two-button front.", fit: "slim", stretch: "low", fabric: "Wool blend", price: 199.99, colorway: "#2E3138", garment: true },
  { brand: "cos", category: "t-shirts", slug: "cos-relaxed-heavyweight-tee", name: "Relaxed Heavyweight T-shirt", description: "Dense, structured cotton T-shirt with a relaxed body.", fit: "relaxed", stretch: "none", fabric: "100% organic cotton", price: 45, colorway: "#D8D2C6", garment: true },
  { brand: "cos", category: "trousers", slug: "cos-wide-leg-wool-trousers", name: "Wide-Leg Wool Trousers", description: "Pleated, wide-leg trousers in a fluid wool blend.", fit: "relaxed", stretch: "low", fabric: "Wool blend", price: 135, colorway: "#5A5650", garment: false },
];

/** Garment ease (cm) used only to GENERATE demo garment measurements. */
const GEN_EASE: Record<Fit, { chest: number; waist: number; hip: number; shoulder: number; thigh: number }> = {
  slim: { chest: 6, waist: 6, hip: 4, shoulder: 0.5, thigh: 4 },
  regular: { chest: 10, waist: 10, hip: 8, shoulder: 1.5, thigh: 7 },
  relaxed: { chest: 16, waist: 14, hip: 12, shoulder: 3, thigh: 11 },
  oversized: { chest: 26, waist: 24, hip: 16, shoulder: 7, thigh: 15 },
};

/** Generate demo garment measurements per size from the brand chart. */
export function garmentFor(product: ProductSpec, sizes: GenSize[], group: string): Record<string, Partial<Record<BodyKey | "body_length", number>>> {
  const e = GEN_EASE[product.fit];
  const bias = product.bias ?? 0;
  const out: Record<string, Partial<Record<BodyKey | "body_length", number>>> = {};
  for (const s of sizes) {
    const mid = (k: BodyKey) => {
      const p = s.points[k];
      return p ? (p.min + p.max) / 2 : undefined;
    };
    const m: Partial<Record<BodyKey | "body_length", number>> = {};
    if (group === "bottom") {
      const w = mid("waist");
      const h = mid("hip");
      if (w) m.waist = r1(w + 1 + bias);
      if (h) m.hip = r1(h + e.hip + bias);
      if (h) m.thigh = r1(h * 0.58 + e.thigh + bias * 0.5);
      if (product.category !== "shorts") m.inseam = product.category === "trousers" ? (product.slug.includes("ankle") ? 74 : 80) : 81;
    } else {
      const c = mid("chest");
      const w = mid("waist");
      // body shoulder width grows ~1.6 cm per size from 42 cm (XS)
      const sizeIdx = LETTERS.includes(s.label) ? LETTERS.indexOf(s.label) : s.index;
      if (c) m.chest = r1(c + e.chest + bias);
      if (w) m.waist = r1(w + e.waist + bias);
      m.shoulder = r1(42 + sizeIdx * 1.6 + e.shoulder + bias * 0.25);
      if (product.category === "shirts") {
        const n = mid("neck");
        const sl = mid("sleeve");
        if (n) m.neck = r1(n + 2);
        if (sl) m.sleeve = r1(sl + 2);
      }
      if (["jackets", "hoodies", "formal-wear"].includes(product.category)) m.arm_length = r1(60 + sizeIdx * 1 + 2.5);
      m.body_length = r1(68 + sizeIdx * 2 + (product.fit === "oversized" ? 3 : 0) + (product.category === "jackets" ? -2 : 0));
    }
    out[s.label] = m;
  }
  return out;
}
