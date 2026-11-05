"use client";

import { motion } from "framer-motion";
import { ARM_L, ARM_R, BODY_PATH, HEAD, POINTS, TOP_PATH, TROUSER_PATH } from "./figure";

const ease = [0.22, 1, 0.36, 1] as const;

const callouts = [
  { key: "shoulder" as const, label: "Shoulder", value: "45.5", side: "right" },
  { key: "chest" as const, label: "Chest", value: "100.0", side: "right" },
  { key: "waist" as const, label: "Waist", value: "84.0", side: "left" },
  { key: "hip" as const, label: "Hip", value: "100.5", side: "left" },
  { key: "inseam" as const, label: "Inseam", value: "80.0", side: "left" },
];

const brands = [
  { brand: "H&M", cat: "Regular tee", size: "M", q: "Good" },
  { brand: "Zara", cat: "Boxy tee", size: "L", q: "Good" },
  { brand: "Levi's", cat: "Straight jean", size: "32", q: "Excellent" },
];

/** Editorial composition: a croquis study in neutral clothing with live measurement annotations. */
export function HeroVisual() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-[#E9E4DA] sm:aspect-[5/6] lg:aspect-[4/5]">
      {/* Editorial frame marks */}
      <div className="absolute inset-x-5 top-5 flex items-start justify-between text-[10px] tracking-[0.18em] text-[#6e6a62] uppercase sm:inset-x-7 sm:top-7">
        <span>Fit study — No. 04</span>
        <span className="num hidden sm:inline">FM / FW26</span>
      </div>
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between text-[10px] tracking-[0.18em] text-[#6e6a62] uppercase sm:inset-x-7 sm:bottom-7">
        <span>One profile</span>
        <span>Ten brands</span>
      </div>

      {/* Large serif backdrop numeral */}
      <div aria-hidden className="pointer-events-none absolute -right-6 top-10 select-none font-serif text-[220px] leading-none text-[#ddd6ca] italic sm:text-[300px]">
        M
      </div>

      <svg viewBox="-80 -10 360 490" className="absolute inset-0 m-auto h-[88%] w-full" role="img" aria-label="Illustrated figure in neutral clothing with chest, waist, hip and inseam measurements annotated">
        <defs>
          <linearGradient id="hv-shade" x1="0" x2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.08" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="462" rx="58" ry="6" fill="#000" opacity="0.07" />
        <g fill="#D9CDBD" stroke="#8e8576" strokeWidth="0.6">
          <path d={ARM_L} />
          <path d={ARM_R} />
          <path d={BODY_PATH} />
          <ellipse {...HEAD} />
        </g>
        {/* hair — simple sculpted cap */}
        <path d="M82 30 Q84 10 100 12 Q118 10 119 30 Q114 20 100 21 Q88 20 82 30 Z" fill="#3a3530" />
        {/* trousers */}
        <path d={TROUSER_PATH} fill="#5A5650" stroke="#3d3a35" strokeWidth="0.6" />
        <path d={TROUSER_PATH} fill="url(#hv-shade)" />
        <path d="M100 232 L100 276" stroke="#3d3a35" strokeWidth="0.6" />
        {/* top — relaxed knit */}
        <path d={TOP_PATH} fill="#F4F1EA" stroke="#9b9384" strokeWidth="0.6" />
        <path d={TOP_PATH} fill="url(#hv-shade)" />
        <path d="M92 68 Q100 80 108 68" fill="none" stroke="#9b9384" strokeWidth="0.6" />
        <path d="M64 240 L136 240" stroke="#c9c2b5" strokeWidth="0.6" />

        {/* measurement overlay */}
        {callouts.map((c, i) => {
          const p = POINTS[c.key];
          const [ax, ay] = p.anchor;
          const lx = c.side === "right" ? 205 : -5;
          return (
            <motion.g key={c.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.12, duration: 0.6, ease }}>
              <motion.path
                d={p.d}
                fill="none"
                stroke="#B58A5A"
                strokeWidth="1.1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.9, ease }}
              />
              <circle cx={ax} cy={ay} r="2.2" fill="#B58A5A" />
              <path d={`M${ax} ${ay} L${lx + (c.side === "right" ? -6 : 6)} ${ay}`} stroke="#B58A5A" strokeWidth="0.5" />
              <text x={lx} y={ay - 2} textAnchor={c.side === "right" ? "start" : "end"} fontSize="8" letterSpacing="1.2" fill="#6e6a62" style={{ textTransform: "uppercase" }}>
                {c.label}
              </text>
              <text x={lx} y={ay + 10} textAnchor={c.side === "right" ? "start" : "end"} fontSize="12" fontWeight="600" fill="#171717" className="num">
                {c.value}
                <tspan fontSize="8" fill="#77756F" dx="2">cm</tspan>
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Cross-brand result strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.7, ease }}
        className="absolute right-4 bottom-12 left-4 rounded-sm border border-white/60 bg-white/80 p-3 backdrop-blur-sm sm:right-auto sm:bottom-14 sm:left-7 sm:w-[264px]"
      >
        <p className="mb-2 text-[9.5px] font-semibold tracking-[0.16em] text-muted uppercase">Your size, by brand</p>
        <ul className="divide-y divide-line">
          {brands.map((b) => (
            <li key={b.brand} className="flex items-center justify-between py-1.5 text-[12px]">
              <span className="min-w-0">
                <span className="font-semibold text-ink">{b.brand}</span>
                <span className="ml-1.5 text-muted">{b.cat}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[10.5px] text-success">{b.q}</span>
                <span className="num grid h-6 min-w-8 place-items-center rounded-xs bg-ink px-1.5 text-[11.5px] font-semibold text-canvas">{b.size}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[9.5px] text-faint">Illustrative example</p>
      </motion.div>
    </div>
  );
}
