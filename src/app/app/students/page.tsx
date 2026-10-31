"use client";
import { AlertTriangle, ArrowUpDown, Download, Search, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, Empty, ErrorState, PageHeader, PageSkeleton } from "@/components/ui";
import { useApi } from "@/lib/client";

interface Row { id: string; name: string; roll: string; email: string; attendance: number; average: number; coins: number; streak: number; flags: { label: string; rule: string; level: string }[]; submissions: number }
type Key = "roll" | "name" | "attendance" | "average" | "coins" | "streak";

export default function Students() {
  const { data, error, loading, reload } = useApi<{ students: Row[] }>("/api/students");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "roll", dir: 1 });
  const [risk, setRisk] = useState(false);
  const rows = useMemo(() => (data?.students ?? [])
    .filter((s) => (!risk || s.flags.length) && (s.name + s.roll).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a[sort.k] > b[sort.k] ? 1 : -1) * sort.dir), [data, q, sort, risk]);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;

  const csv = () => {
    const head = "roll,name,email,attendance,average,coins,streak,flags";
    const lines = data.students.map((s) => [s.roll, s.name, s.email, s.attendance, s.average, s.coins, s.streak, `"${s.flags.map((f) => f.label).join("; ")}"`].join(","));
    const url = URL.createObjectURL(new Blob([[head, ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "classpulse-gradebook.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const th = (k: Key, label: string) => (
    <th scope="col" className="font-semibold pb-2 pr-3" aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}<ArrowUpDown size={12} aria-hidden />
      </button>
    </th>
  );
  return (
    <>
      <PageHeader title="Students" desc="Performance reports with transparent risk flags. Hover a flag to see the rule behind it." action={<button className="btn-outline" onClick={csv}><Download size={16} aria-hidden /> Export CSV</button>} />
      <div className="card p-5">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden /><input className="input !pl-9" placeholder="Search by name or roll" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" /></div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={risk} onChange={(e) => setRisk(e.target.checked)} /> Only students needing attention</label>
        </div>
        {rows.length === 0 ? <Empty icon={Users} title="No students match" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted">{th("roll", "Roll")}{th("name", "Name")}{th("attendance", "Attendance")}{th("average", "Average")}{th("coins", "Coins")}{th("streak", "Streak")}<th className="font-semibold pb-2">Flags</th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t border-line/60 hover:bg-ink/5">
                    <td className="py-2.5 pr-3 tabular-nums text-muted">{s.roll}</td>
                    <td className="pr-3"><Link href={`/app/students/${s.id}`} className="flex items-center gap-2 font-semibold hover:text-primary"><Avatar name={s.name} size={28} />{s.name}</Link></td>
                    <td className={`pr-3 tabular-nums ${s.attendance < 75 ? "text-bad font-bold" : ""}`}>{s.attendance}%</td>
                    <td className={`pr-3 tabular-nums ${s.average < 50 ? "text-bad font-bold" : ""}`}>{s.average}%</td>
                    <td className="pr-3 tabular-nums">{s.coins}</td>
                    <td className="pr-3 tabular-nums">{s.streak}</td>
                    <td><div className="flex flex-wrap gap-1">{s.flags.map((f) => <span key={f.label} title={f.rule} className={`chip ${f.level === "high" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"}`}><AlertTriangle size={11} aria-hidden />{f.label}<span className="sr-only">: {f.rule}</span></span>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
