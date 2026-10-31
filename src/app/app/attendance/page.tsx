"use client";
import { motion } from "framer-motion";
import { CheckCheck, Clock, Keyboard, Save, UserCheck, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { Card, CardTitle, ErrorState, Field, Grid, PageHeader, PageSkeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client";

type S = "present" | "absent" | "late";
interface Data { students: { id: string; name: string; roll: string; rate: number }[]; sessions: { id: string; date: string; subject: string; subjectId: string; present: number; total: number; records: Record<string, S> }[]; subjects: { id: string; name: string }[]; today: string }

const NEXT: Record<S, S> = { present: "absent", absent: "late", late: "present" };
const STYLE: Record<S, { cls: string; Icon: import("lucide-react").LucideIcon; label: string }> = {
  present: { cls: "bg-good/15 border-good/50 text-good", Icon: UserCheck, label: "Present" },
  absent: { cls: "bg-bad/15 border-bad/50 text-bad", Icon: UserX, label: "Absent" },
  late: { cls: "bg-warn/15 border-warn/50 text-warn", Icon: Clock, label: "Late" },
};

export default function Attendance() {
  const { data, error, loading, reload } = useApi<Data>("/api/attendance");
  const { toast } = useApp();
  const [subjectId, setSubjectId] = useState("math");
  const [date, setDate] = useState("");
  const [rec, setRec] = useState<Record<string, S>>({});
  const [busy, setBusy] = useState(false);
  const started = useRef<number>(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!data) return;
    const d = date || data.today;
    if (!date) setDate(d);
    const existing = data.sessions.find((s) => s.date === d && s.subjectId === subjectId);
    setRec(existing ? existing.records : Object.fromEntries(data.students.map((s) => [s.id, "present" as S])));
    started.current = Date.now();
  }, [data, date, subjectId]);

  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;

  const counts = { present: 0, absent: 0, late: 0 };
  Object.values(rec).forEach((v) => counts[v]++);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ updated: boolean }>("/api/attendance", { body: { subjectId, date, records: rec } });
      const secs = Math.round((Date.now() - started.current) / 1000);
      toast(`${r.updated ? "Updated" : "Saved"} attendance for ${data.students.length} students in ${secs}s.`);
      reload();
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  };
  const key = (e: React.KeyboardEvent, i: number, id: string) => {
    const k = e.key.toLowerCase();
    const map: Record<string, S> = { p: "present", a: "absent", l: "late" };
    if (map[k]) { setRec((r) => ({ ...r, [id]: map[k] })); refs.current[i + 1]?.focus(); e.preventDefault(); }
    const cols = 5;
    if (e.key === "ArrowRight") refs.current[i + 1]?.focus();
    if (e.key === "ArrowLeft") refs.current[i - 1]?.focus();
    if (e.key === "ArrowDown") refs.current[i + cols]?.focus();
    if (e.key === "ArrowUp") refs.current[i - cols]?.focus();
  };

  return (
    <>
      <PageHeader title="Attendance" desc="Quick-mark: everyone starts present. Tap to cycle, or use the keyboard." action={<button className="btn-primary" onClick={save} disabled={busy}><Save size={17} aria-hidden /> Save attendance</button>} />
      <Grid className="lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <Field label="Subject"><select className="input !w-48" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Date"><input className="input !w-44" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <button className="btn-soft" onClick={() => setRec(Object.fromEntries(data.students.map((s) => [s.id, "present" as S])))}><CheckCheck size={16} aria-hidden /> All present</button>
            <div className="flex gap-2 ml-auto text-sm">
              {(Object.keys(counts) as S[]).map((k) => <span key={k} className={`chip border ${STYLE[k].cls}`}>{STYLE[k].label} {counts[k]}</span>)}
            </div>
          </div>
          <p className="text-sm text-muted mb-3 flex items-center gap-2"><Keyboard size={15} aria-hidden /> Focus a student, press <kbd className="px-1.5 rounded border border-line">P</kbd> <kbd className="px-1.5 rounded border border-line">A</kbd> or <kbd className="px-1.5 rounded border border-line">L</kbd>. Arrow keys move around.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2" role="grid" aria-label="Students">
            {data.students.map((s, i) => {
              const st = rec[s.id] ?? "present";
              const Sty = STYLE[st];
              return (
                <motion.button key={s.id} ref={(el) => { refs.current[i] = el; }} layout whileTap={{ scale: 0.95 }}
                  onClick={() => setRec((r) => ({ ...r, [s.id]: NEXT[st] }))} onKeyDown={(e) => key(e, i, s.id)}
                  className={`rounded-2xl border-2 p-3 text-left transition-colors ${Sty.cls}`} aria-label={`${s.name}, ${Sty.label}`}>
                  <span className="flex items-center justify-between"><span className="text-xs font-bold opacity-80">{s.roll}</span><Sty.Icon size={16} aria-hidden /></span>
                  <span className="block font-semibold text-ink text-sm mt-1 truncate">{s.name}</span>
                  <span className="text-xs font-bold">{Sty.label}</span>
                </motion.button>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardTitle icon={CheckCheck}>Recent sessions</CardTitle>
          <ul className="space-y-1 max-h-[560px] overflow-auto">
            {data.sessions.slice(0, 20).map((s) => (
              <li key={s.id}><button className="w-full flex justify-between gap-2 rounded-xl px-3 py-2 hover:bg-ink/5 text-left text-sm" onClick={() => { setDate(s.date); setSubjectId(s.subjectId); }}>
                <span><b>{s.date}</b><span className="block text-muted">{s.subject}</span></span>
                <span className="tabular-nums">{s.present}/{s.total}</span>
              </button></li>
            ))}
          </ul>
        </Card>
      </Grid>
    </>
  );
}
