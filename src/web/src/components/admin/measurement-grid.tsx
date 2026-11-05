"use client";

import { Plus, Trash2 } from "lucide-react";
import { MEASUREMENT_LABEL } from "@/lib/labels";
import type { MeasurementKey } from "@/lib/types";
import { Button, cn } from "../ui/primitives";

export const ALL_KEYS: MeasurementKey[] = ["chest", "shoulder", "neck", "sleeve", "arm_length", "bicep", "waist", "hip", "thigh", "inseam", "outseam", "calf", "body_length"];

export type RangeCell = { min: string; max: string };
export interface GridRow<T> { label: string; cells: Partial<Record<MeasurementKey, T>> }

/**
 * Spreadsheet-like editor for size × measurement data. All values in centimetres (canonical).
 * mode "range" edits min/max (brand charts); mode "value" edits a single garment value.
 */
export function MeasurementGrid<M extends "range" | "value">({
  mode, keys, setKeys, rows, setRows,
}: {
  mode: M;
  keys: MeasurementKey[];
  setKeys: (k: MeasurementKey[]) => void;
  rows: GridRow<M extends "range" ? RangeCell : string>[];
  setRows: (r: GridRow<M extends "range" ? RangeCell : string>[]) => void;
}) {
  type Cell = M extends "range" ? RangeCell : string;
  const update = (i: number, patch: Partial<GridRow<Cell>>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setCell = (i: number, k: MeasurementKey, v: Cell) => update(i, { cells: { ...rows[i]!.cells, [k]: v } });
  const num = (s: string) => s.replace(/[^\d.]/g, "").slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Measurement columns">
        {ALL_KEYS.map((k) => {
          const on = keys.includes(k);
          return (
            <button key={k} type="button" onClick={() => setKeys(on ? keys.filter((x) => x !== k) : ALL_KEYS.filter((x) => x === k || keys.includes(x)))} aria-pressed={on}
              className={cn("h-8 rounded-full border px-3 text-[12px] font-medium transition-colors", on ? "border-ink bg-ink text-canvas" : "border-line-strong text-muted hover:text-ink")}>
              {MEASUREMENT_LABEL[k]}
            </button>
          );
        })}
      </div>
      <div className="scrollbar-none overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-max text-[13px]">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-left text-[11px] tracking-[0.06em] text-muted uppercase">
              <th className="px-3 py-2 font-semibold">Size</th>
              {keys.map((k) => <th key={k} className="px-3 py-2 font-semibold whitespace-nowrap">{MEASUREMENT_LABEL[k]} <span className="normal-case">(cm)</span></th>)}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-2 py-1.5">
                  <input aria-label={`Size ${i + 1} label`} value={r.label} onChange={(e) => update(i, { label: e.target.value.slice(0, 12) })} className="h-9 w-20 rounded-xs border border-line-strong px-2 font-semibold focus:border-ink focus:outline-none" />
                </td>
                {keys.map((k) => {
                  const c = r.cells[k];
                  return (
                    <td key={k} className="px-2 py-1.5">
                      {mode === "range" ? (
                        <span className="flex items-center gap-1">
                          <input aria-label={`${r.label} ${MEASUREMENT_LABEL[k]} min`} inputMode="decimal" value={(c as RangeCell | undefined)?.min ?? ""} onChange={(e) => setCell(i, k, { ...((c as RangeCell) ?? { min: "", max: "" }), min: num(e.target.value) } as Cell)} className="num h-9 w-16 rounded-xs border border-line-strong px-2 focus:border-ink focus:outline-none" placeholder="min" />
                          <span className="text-faint">–</span>
                          <input aria-label={`${r.label} ${MEASUREMENT_LABEL[k]} max`} inputMode="decimal" value={(c as RangeCell | undefined)?.max ?? ""} onChange={(e) => setCell(i, k, { ...((c as RangeCell) ?? { min: "", max: "" }), max: num(e.target.value) } as Cell)} className="num h-9 w-16 rounded-xs border border-line-strong px-2 focus:border-ink focus:outline-none" placeholder="max" />
                        </span>
                      ) : (
                        <input aria-label={`${r.label} ${MEASUREMENT_LABEL[k]}`} inputMode="decimal" value={(c as string | undefined) ?? ""} onChange={(e) => setCell(i, k, num(e.target.value) as Cell)} className="num h-9 w-20 rounded-xs border border-line-strong px-2 focus:border-ink focus:outline-none" placeholder="—" />
                      )}
                    </td>
                  );
                })}
                <td className="px-2">
                  <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-sm text-muted hover:text-danger" aria-label={`Remove size ${r.label}`}><Trash2 className="size-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="secondary" onClick={() => setRows([...rows, { label: "", cells: {} }])}><Plus className="size-3.5" /> Add size</Button>
    </div>
  );
}
