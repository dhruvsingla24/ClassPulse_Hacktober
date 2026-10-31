"use client";
import { motion } from "framer-motion";
import { CalendarClock, CalendarPlus, Download, Loader2, Video } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { Empty, ErrorState, Field, Modal, PageHeader, PageSkeleton } from "@/components/ui";
import { api, fmtDateTime, useApi } from "@/lib/client";
import type { Meeting } from "@/lib/types";

const KIND: Record<Meeting["kind"], string> = { "live-class": "Live class", faculty: "Faculty", consultation: "Consultation", "parent-teacher": "Parent-teacher" };

function ics(ms: Meeting[]) {
  const f = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ev = ms.map((m) => [
    "BEGIN:VEVENT", `UID:${m.id}@classpulse`, `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(m.at)}`,
    `DTEND:${f(new Date(new Date(m.at).getTime() + m.minutes * 60000).toISOString())}`, `SUMMARY:${m.title}`, `URL:https://meet.jit.si/${m.room}`, "END:VEVENT",
  ].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ClassPulse//EN", ...ev, "END:VCALENDAR"].join("\r\n");
}

export default function Meetings() {
  const { me, toast } = useApp();
  const { data, error, loading, reload } = useApi<{ meetings: Meeting[] }>("/api/meetings");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", kind: "live-class" as Meeting["kind"], at: "", minutes: 45 });
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const teacher = me?.user?.role === "teacher";
  const upcoming = data.meetings.filter((m) => new Date(m.at).getTime() + m.minutes * 60000 > Date.now());
  const exportIcs = () => {
    const url = URL.createObjectURL(new Blob([ics(upcoming)], { type: "text/calendar" }));
    const a = document.createElement("a"); a.href = url; a.download = "classpulse.ics"; a.click(); URL.revokeObjectURL(url);
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api("/api/meetings", { body: { ...f, at: new Date(f.at).toISOString() } }); toast("Meeting scheduled."); setOpen(false); reload(); }
    catch (err) { toast((err as Error).message, "err"); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Meetings & live classes" desc="Join opens Jitsi Meet in a new tab. No account needed." action={<>
        <button className="btn-outline" onClick={exportIcs} disabled={!upcoming.length}><Download size={16} aria-hidden /> Export iCal</button>
        {teacher && <button className="btn-primary" onClick={() => setOpen(true)}><CalendarPlus size={16} aria-hidden /> Schedule</button>}
      </>} />
      {upcoming.length === 0 ? <div className="card"><Empty icon={CalendarClock} title="Nothing scheduled" /></div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {upcoming.map((m, i) => {
            const live = Date.now() >= new Date(m.at).getTime() - 10 * 60000;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card card-hover p-5 flex gap-4">
                <div className="text-center rounded-2xl bg-primary/10 text-primary px-3 py-2 h-fit">
                  <div className="text-xs font-bold uppercase">{new Date(m.at).toLocaleDateString(undefined, { month: "short" })}</div>
                  <div className="font-display text-2xl font-extrabold">{new Date(m.at).getDate()}</div>
                </div>
                <div className="flex-1">
                  <span className="chip bg-ink/5 text-muted">{KIND[m.kind]}</span>
                  <h2 className="font-bold mt-1">{m.title}</h2>
                  <p className="text-sm text-muted">{fmtDateTime(m.at)} · {m.minutes} min</p>
                  <a href={`https://meet.jit.si/${m.room}`} target="_blank" rel="noreferrer" className={`${live ? "btn-primary" : "btn-soft"} mt-3 text-sm`}><Video size={15} aria-hidden /> {live ? "Join now" : "Join link"}</a>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Schedule a meeting">
        <form onSubmit={create} className="space-y-3">
          <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <Field label="Type"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Meeting["kind"] })}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="When"><input className="input" type="datetime-local" value={f.at} onChange={(e) => setF({ ...f, at: e.target.value })} required /></Field>
            <Field label="Minutes"><input className="input" type="number" min={10} max={240} value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} /></Field>
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Schedule</button>
        </form>
      </Modal>
    </>
  );
}
