"use client";
import { motion } from "framer-motion";

/** GitHub-style consistency calendar for the last 18 weeks. */
export function Heatmap({ days }: { days: string[] }) {
  const set = new Set(days);
  const weeks = 18;
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
  const cells: { date: string; on: boolean; future: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    cells.push({ date: z, on: set.has(z), future: d > end });
  }
  const active = cells.filter((c) => c.on).length;
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="grid grid-flow-col grid-rows-7 gap-[3px] w-max" role="img" aria-label={`${active} active days in the last ${weeks} weeks`}>
          {cells.map((c, i) => (
            <motion.span key={c.date} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.002 }}
              title={`${c.date}${c.on ? " · active" : ""}`}
              className={`h-[13px] w-[13px] rounded-[4px] ${c.future ? "opacity-0" : c.on ? "bg-good" : "bg-ink/10"}`} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span><b className="text-ink">{active}</b> active days</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-ink/10" aria-hidden />No activity</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-good" aria-hidden />Learned something</span>
        {[7, 30, 100].map((m) => <span key={m} className={`chip ${active >= m ? "bg-good/15 text-good" : "bg-ink/5"}`}>{m}-day milestone {active >= m ? "✓" : ""}</span>)}
      </div>
    </div>
  );
}
