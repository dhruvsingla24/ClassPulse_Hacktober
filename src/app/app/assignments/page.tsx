"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, Clock, Download, FileText, Loader2, Plus, RotateCcw, Send, Star } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { Empty, ErrorState, Field, Modal, PageHeader, PageSkeleton } from "@/components/ui";
import { api, dueIn, fmtDateTime, useApi } from "@/lib/client";

interface Sub { id: string; studentId: string; text: string; submittedAt: string; status: "submitted" | "graded" | "resubmit"; marks?: number; feedback?: string; student?: string; roll?: string }
interface A { id: string; title: string; description: string; due: string; maxMarks: number; subject: string; subjectId: string; submissions: Sub[]; totalStudents: number }

const TEMPLATES = ["Clear and complete. Well done!", "Good start. Show every step of your working.", "Check your units and signs.", "Re-read the question: you answered a different part."];

export default function Assignments() {
  const { me } = useApp();
  const { data, error, loading, reload } = useApi<{ assignments: A[] }>("/api/assignments");
  const [creating, setCreating] = useState(false);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const teacher = me?.user?.role === "teacher";
  return (
    <>
      <PageHeader title="Assignments" desc={teacher ? "Publish work, read submissions, grade with templates." : "Your work, deadlines, grades and feedback."} action={teacher && <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={17} aria-hidden /> New assignment</button>} />
      {data.assignments.length === 0 ? <div className="card"><Empty icon={ClipboardCheck} title="No assignments yet" /></div> : (
        <div className="space-y-4">
          {data.assignments.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              {teacher ? <TeacherCard a={a} reload={reload} /> : <StudentCard a={a} reload={reload} />}
            </motion.div>
          ))}
        </div>
      )}
      <CreateModal open={creating} onClose={() => setCreating(false)} onCreated={reload} />
    </>
  );
}

function Header({ a, right }: { a: A; right?: React.ReactNode }) {
  const overdue = new Date(a.due) < new Date();
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div>
        <span className="chip bg-ink/5 text-muted">{a.subject} · {a.maxMarks} marks</span>
        <h2 className="text-lg font-bold mt-1.5">{a.title}</h2>
        <p className="text-muted text-sm mt-1 prose-read">{a.description}</p>
      </div>
      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
        <span className={`chip ${overdue ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"}`}><Clock size={12} aria-hidden />{dueIn(a.due)}</span>
        {right}
      </div>
    </div>
  );
}

function StudentCard({ a, reload }: { a: A; reload: () => void }) {
  const { toast, refreshMe, confetti } = useApp();
  const sub = a.submissions[0];
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api<{ late: boolean }>(`/api/assignments/${a.id}`, { body: { text } });
      toast(r.late ? "Submitted (after the deadline)." : "Submitted! +15 coins");
      if (!r.late) confetti();
      setOpen(false); setText(""); reload(); refreshMe();
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  };
  const download = () => {
    const blob = new Blob([`${a.title}\n${a.subject} · ${a.maxMarks} marks · due ${fmtDateTime(a.due)}\n\n${a.description}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href = url; el.download = `${a.title}.txt`; el.click(); URL.revokeObjectURL(url);
  };
  return (
    <section className="card p-5">
      <Header a={a} right={sub ? (
        sub.status === "graded" ? <span className="chip bg-good/15 text-good"><Star size={12} aria-hidden /> {sub.marks}/{a.maxMarks}</span>
          : sub.status === "resubmit" ? <span className="chip bg-bad/15 text-bad"><RotateCcw size={12} aria-hidden /> Resubmit</span>
            : <span className="chip bg-primary/15 text-primary"><CheckCircle2 size={12} aria-hidden /> Submitted</span>
      ) : <span className="chip bg-ink/10">Not submitted</span>} />
      {sub?.feedback && <p className="mt-3 rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm"><b>Teacher feedback:</b> {sub.feedback}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-ghost text-sm" onClick={download}><Download size={15} aria-hidden /> Instructions</button>
        {(!sub || sub.status === "resubmit") && <button className="btn-primary text-sm" onClick={() => { setOpen((o) => !o); setText(sub?.text ?? ""); }}><Send size={15} aria-hidden /> {sub ? "Resubmit" : "Submit answer"}</button>}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <label className="sr-only" htmlFor={`ans-${a.id}`}>Your answer</label>
            <textarea id={`ans-${a.id}`} className="input min-h-[140px] mt-4" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer. Show your working." />
            <button className="btn-primary mt-2" onClick={submit} disabled={busy || text.trim().length < 5}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />} Submit</button>
          </motion.div>
        )}
      </AnimatePresence>
      {sub && !open && <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">Your submission · {fmtDateTime(sub.submittedAt)}</summary><p className="mt-2 whitespace-pre-wrap rounded-xl bg-ink/5 p-3">{sub.text}</p></details>}
    </section>
  );
}

function TeacherCard({ a, reload }: { a: A; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const graded = a.submissions.filter((s) => s.status === "graded").length;
  const pending = a.submissions.filter((s) => s.status === "submitted");
  return (
    <section className="card p-5">
      <Header a={a} right={<span className="text-sm text-muted">{a.submissions.length}/{a.totalStudents} submitted · {graded} graded</span>} />
      <div className="mt-3 h-2 rounded-full bg-ink/10 overflow-hidden flex" aria-hidden>
        <motion.div className="bg-good" initial={{ width: 0 }} animate={{ width: `${(graded / a.totalStudents) * 100}%` }} />
        <motion.div className="bg-primary" initial={{ width: 0 }} animate={{ width: `${(pending.length / a.totalStudents) * 100}%` }} />
      </div>
      <button className="btn-soft text-sm mt-4" onClick={() => setOpen((o) => !o)}><FileText size={15} aria-hidden /> {open ? "Hide" : "Review"} submissions {pending.length > 0 && `(${pending.length} to grade)`}</button>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-3">
            {a.submissions.length === 0 && <li className="text-muted text-sm">No submissions yet.</li>}
            {[...a.submissions].sort((x, y) => (x.status === "submitted" ? -1 : 1) - (y.status === "submitted" ? -1 : 1)).map((s) => <Grade key={s.id} s={s} a={a} reload={reload} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

function Grade({ s, a, reload }: { s: Sub; a: A; reload: () => void }) {
  const { toast } = useApp();
  const [marks, setMarks] = useState<string>(s.marks?.toString() ?? "");
  const [fb, setFb] = useState(s.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const act = async (action: "grade" | "resubmit") => {
    setBusy(true);
    try {
      await api(`/api/submissions/${s.id}`, { method: "PATCH", body: action === "grade" ? { action, marks: Number(marks), feedback: fb } : { action, feedback: fb } });
      toast(action === "grade" ? `Graded ${s.student}: ${marks}/${a.maxMarks}` : `Asked ${s.student} to resubmit.`);
      reload();
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  };
  const late = new Date(s.submittedAt) > new Date(a.due);
  return (
    <li className="rounded-2xl border border-line/70 bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-semibold">{s.student} <span className="text-xs text-muted">{s.roll}</span></span>
        <span className="text-xs text-muted">{fmtDateTime(s.submittedAt)}{late && <span className="text-bad font-semibold"> · late</span>} · {s.status}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm bg-ink/5 rounded-xl p-3">{s.text}</p>
      <div className="mt-3 grid sm:grid-cols-[110px_1fr] gap-2">
        <Field label={`Marks /${a.maxMarks}`}><input className="input" type="number" min={0} max={a.maxMarks} value={marks} onChange={(e) => setMarks(e.target.value)} /></Field>
        <Field label="Feedback"><input className="input" value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Comment for the student" /></Field>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">{TEMPLATES.map((t) => <button key={t} className="chip bg-ink/5 hover:bg-primary/10 hover:text-primary" onClick={() => setFb(t)}>{t}</button>)}</div>
      <div className="flex gap-2 mt-3">
        <button className="btn-primary text-sm" disabled={busy || marks === "" || Number(marks) > a.maxMarks} onClick={() => act("grade")}><CheckCircle2 size={15} aria-hidden /> Save grade</button>
        <button className="btn-outline text-sm" disabled={busy || fb.trim().length < 3} onClick={() => act("resubmit")}><RotateCcw size={15} aria-hidden /> Request resubmission</button>
      </div>
    </li>
  );
}

function CreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useApp();
  const subj = useApi<{ subjects: { id: string; name: string }[] }>(open ? "/api/lectures" : null);
  const [f, setF] = useState({ subjectId: "cs", title: "", description: "", due: "", maxMarks: 10 });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api("/api/assignments", { body: { ...f, maxMarks: Number(f.maxMarks) } });
      toast("Assignment published. Students were notified.");
      onClose(); onCreated();
      setF({ subjectId: "cs", title: "", description: "", due: "", maxMarks: 10 });
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="New assignment">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Subject"><select className="input" value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })}>{subj.data?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
        <Field label="Instructions"><textarea className="input min-h-[100px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due"><input className="input" type="datetime-local" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} required /></Field>
          <Field label="Max marks"><input className="input" type="number" min={1} max={100} value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: Number(e.target.value) })} /></Field>
        </div>
        {err && <p role="alert" className="text-sm text-bad font-semibold">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />} Publish to class</button>
      </form>
    </Modal>
  );
}
