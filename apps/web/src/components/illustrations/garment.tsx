import { cn } from "@/lib/cn";

/**
 * Technical flat-sketch renderings used for demo products that have no photography.
 * Clearly illustrative; real product images (Cloudinary/https) replace them when set.
 */
const SHAPES: Record<string, { body: string; details: string[]; dots?: [number, number][] }> = {
  tee: {
    body: "M72 32 Q100 50 128 32 L163 46 L182 82 L157 93 L150 78 L151 176 L49 176 L50 78 L43 93 L18 82 L37 46 Z",
    details: ["M72 32 Q100 50 128 32", "M75 34 Q100 55 125 34", "M150 78 L157 93", "M50 78 L43 93"],
  },
  polo: {
    body: "M74 30 L126 30 L163 46 L182 82 L157 93 L150 78 L151 176 L49 176 L50 78 L43 93 L18 82 L37 46 Z",
    details: ["M74 30 L100 50 L126 30", "M74 30 L86 46 L100 50", "M126 30 L114 46 L100 50", "M100 50 L100 84", "M94 50 L94 84 L106 84 L106 50"],
    dots: [[100, 62], [100, 75]],
  },
  shirt: {
    body: "M74 28 L126 28 L164 42 L188 160 L168 165 L150 82 L151 184 L49 184 L50 82 L32 165 L12 160 L36 42 Z",
    details: ["M74 28 L100 44 L126 28", "M74 28 L84 42 L100 44 L116 42 L126 28", "M100 44 L100 184", "M188 160 L168 165 L170 150 L186 147", "M12 160 L32 165 L30 150 L14 147", "M60 62 L82 62 L82 82 L60 82"],
    dots: [[100, 58], [100, 82], [100, 106], [100, 130], [100, 154]],
  },
  hoodie: {
    body: "M66 34 Q66 6 100 6 Q134 6 134 34 L166 46 L188 164 L168 169 L151 84 L152 178 L48 178 L49 84 L32 169 L12 164 L34 46 Z",
    details: ["M74 36 Q76 14 100 14 Q124 14 126 36 Q100 56 74 36", "M94 50 L92 78", "M106 50 L108 78", "M66 126 L134 126 L144 162 L56 162 Z", "M48 170 L152 170"],
  },
  jacket: {
    body: "M72 26 L128 26 L166 40 L188 158 L168 163 L151 80 L152 172 L48 172 L49 80 L32 163 L12 158 L34 40 Z",
    details: ["M72 26 L86 46 L100 40 L114 46 L128 26", "M100 40 L100 172", "M58 70 L84 70 L84 92 L58 92 Z", "M116 70 L142 70 L142 92 L116 92 Z", "M48 160 L152 160"],
    dots: [[94, 60], [94, 90], [94, 120], [94, 150]],
  },
  blazer: {
    body: "M74 24 L126 24 L166 40 L186 168 L166 172 L152 82 L154 190 L46 190 L48 82 L34 172 L14 168 L34 40 Z",
    details: ["M74 24 L92 110 L100 130", "M126 24 L108 110 L100 130", "M74 24 L66 54 L84 66", "M126 24 L134 54 L116 66", "M100 130 L100 190", "M58 140 L82 140", "M118 140 L142 140", "M120 64 L138 64"],
    dots: [[100, 142], [100, 162]],
  },
  trousers: {
    body: "M58 18 L142 18 L150 186 L110 188 L100 72 L90 188 L50 186 Z",
    details: ["M58 30 L142 30", "M100 30 L100 72", "M62 30 Q72 52 86 30", "M138 30 Q128 52 114 30", "M75 30 L78 186", "M125 30 L122 186"],
  },
  jeans: {
    body: "M58 18 L142 18 L148 186 L110 188 L100 72 L90 188 L52 186 Z",
    details: ["M58 30 L142 30", "M100 30 Q104 54 100 72", "M62 30 Q68 50 86 30", "M138 30 Q132 50 114 30", "M126 34 L136 34 L136 44 L126 44 Z", "M52 176 L90 177", "M110 177 L148 176"],
  },
  shorts: {
    body: "M54 40 L146 40 L158 132 L110 138 L100 88 L90 138 L42 132 Z",
    details: ["M54 52 L146 52", "M100 52 L100 88", "M58 52 Q68 72 84 52", "M142 52 Q132 72 116 52", "M44 120 L90 126", "M156 120 L110 126"],
  },
};

const CATEGORY_SHAPE: Record<string, keyof typeof SHAPES> = {
  "t-shirts": "tee",
  "polo-t-shirts": "polo",
  shirts: "shirt",
  hoodies: "hoodie",
  jackets: "jacket",
  "formal-wear": "blazer",
  trousers: "trousers",
  jeans: "jeans",
  shorts: "shorts",
};

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function GarmentIllustration({ category, colorway, className, label }: { category: string; colorway?: string | null; className?: string; label?: string }) {
  const shape = SHAPES[CATEGORY_SHAPE[category] ?? "tee"]!;
  const fill = colorway ?? "#D8D2C6";
  const dark = luminance(fill) < 0.18;
  const stroke = dark ? "rgba(255,255,255,0.28)" : "rgba(23,23,23,0.32)";
  const outline = dark ? "var(--fm-garment-edge-dark)" : "rgba(23,23,23,0.55)";
  return (
    <svg viewBox="-10 -10 220 220" className={cn("h-full w-full", className)} role="img" aria-label={label ?? "Garment illustration"}>
      <ellipse cx="100" cy="200" rx="70" ry="5" fill="#000" opacity="0.05" />
      <path d={shape.body} fill={fill} style={{ stroke: outline }} strokeWidth="1.1" strokeLinejoin="round" />
      <g fill="none" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
        {shape.details.map((d, i) => (
          <path key={i} d={d} strokeDasharray={i === shape.details.length - 1 && CATEGORY_SHAPE[category] !== "polo" ? "2.5 2" : undefined} />
        ))}
      </g>
      {shape.dots?.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.7" fill={stroke} />)}
    </svg>
  );
}
