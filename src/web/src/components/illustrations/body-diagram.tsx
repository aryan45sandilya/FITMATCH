"use client";

import { motion } from "framer-motion";
import { MEASUREMENT_LABEL } from "@/lib/labels";
import type { BodyKey, Unit } from "@/lib/types";
import { formatLength } from "@/lib/units";
import { cn } from "@/lib/cn";
import { ARM_L, ARM_R, BODY_PATH, HEAD, POINTS } from "./figure";

/**
 * Human silhouette with measurement points. `focus` highlights the point being edited,
 * `values` shows the user's numbers next to each filled point.
 */
export function BodyDiagram({
  focus, values = {}, unit = "cm", visible, className, compact,
}: {
  focus?: BodyKey | null;
  values?: Partial<Record<BodyKey, number>>;
  unit?: Unit;
  visible?: BodyKey[];
  className?: string;
  compact?: boolean;
}) {
  const keys = (visible ?? (Object.keys(POINTS) as BodyKey[])).filter((k) => k in POINTS);
  return (
    <svg viewBox="-70 -6 340 480" className={cn("h-full w-full", className)} role="img" aria-label={focus ? `Measurement diagram highlighting ${MEASUREMENT_LABEL[focus]}` : "Body measurement diagram"}>
      <defs>
        <pattern id="bd-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" style={{ stroke: "var(--fm-grid)" }} strokeWidth="0.5" />
        </pattern>
      </defs>
      {!compact && <rect x="-70" y="-6" width="340" height="480" fill="url(#bd-grid)" opacity="0.7" />}
      <g style={{ fill: "var(--fm-figure)", stroke: "var(--fm-figure-line)" }} strokeWidth="0.9">
        <path d={ARM_L} />
        <path d={ARM_R} />
        <path d={BODY_PATH} />
        <ellipse {...HEAD} />
      </g>
      <line x1="100" y1="10" x2="100" y2="462" style={{ stroke: "var(--fm-line-strong)" }} strokeWidth="0.6" strokeDasharray="2 4" />

      {keys.map((k) => {
        const p = POINTS[k];
        const active = focus === k;
        const has = values[k] !== undefined;
        const color = active ? "var(--fm-accent)" : has ? "var(--fm-ink)" : "var(--fm-faint)";
        const [ax, ay] = p.anchor;
        const lx = p.side === "right" ? 196 : 4;
        return (
          <g key={k} opacity={focus && !active ? 0.55 : 1}>
            <motion.path
              d={p.d}
              fill="none"
              style={{ stroke: color }}
              strokeWidth={active ? 1.8 : 1.1}
              strokeDasharray={has || active ? undefined : "3 3"}
              initial={false}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6 }}
            />
            <circle cx={ax} cy={ay} r={active ? 3 : 2} style={{ fill: color }} />
            {!compact && (
              <>
                <path d={`M${ax} ${ay} L${lx + (p.side === "right" ? -4 : 4)} ${ay}`} style={{ stroke: color }} strokeWidth="0.5" opacity="0.6" />
                <text
                  x={lx}
                  y={ay - 3}
                  textAnchor={p.side === "right" ? "start" : "end"}
                  className="num"
                  fontSize="9.5"
                  fontWeight={active ? 700 : 600}
                  style={{ fill: active ? "var(--fm-accent)" : "var(--fm-ink)" }}
                >
                  {MEASUREMENT_LABEL[k].replace(" length", "").replace(" width", "")}
                </text>
                <text x={lx} y={ay + 9} textAnchor={p.side === "right" ? "start" : "end"} className="num" fontSize="9" style={{ fill: "var(--fm-muted)" }}>
                  {has ? formatLength(values[k], unit) : "—"}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
