"use client";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Clock, ExternalLink, FileText, Loader2, Plus, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { ErrorState, Field, Modal, PageHeader, PageSkeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client";

interface L { id: string; title: string; topic: string; kind: "notes" | "video" | "link"; minutes: number; published: boolean; done: boolean }
interface S { id: string; name: string; color: string; topics: string[]; lectures: L[]; questions: number }

const KIND = { notes: FileText, video: Video, link: ExternalLink };

export default function Library() {
  const { me } = useApp();
  const { data, error, loading, reload } = useApi<{ subjects: S[] }>("/api/lectures");
  const [creating, setCreating] = useState(false);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const teacher = me?.user?.role === "teacher";
  return (
    <>
      <PageHeader title={teacher ? "Lectures & notes" : "Library"} desc="Subject → topic → lecture. Notes open in a distraction-free reading mode." action={teacher && <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={17} aria-hidden /> New lecture</button>} />
      <div className="space-y-6">
        {data.subjects.map((s, si) => {
          const done = s.lectures.filter((l) => l.done).length;
          return (
            <motion.section key={s.id} id={s.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.06 }} className="card p-5 scroll-mt-24">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-clay" style={{ background: s.color }}><BookOpen size={20} aria-hidden /></span>
                <div className="flex-1"><h2 className="text-lg font-bold">{s.name}</h2><p className="text-sm text-muted">{s.lectures.length} lectures · {s.questions} practice questions{!teacher && ` · ${done}/${s.lectures.length} done`}</p></div>
              </div>
              {s.lectures.length === 0 ? <p className="text-sm text-muted">No lectures yet.</p> : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {s.lectures.map((l) => {
                    const Icon = KIND[l.kind];
                    return (
                      <Link key={l.id} href={`/app/library/${l.id}`} className="group rounded-2xl border border-line/70 bg-raised p-4 hover:border-primary/40 hover:shadow-soft hover:-translate-y-0.5 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="chip bg-ink/5 text-muted"><Icon size={12} aria-hidden />{l.topic}</span>
                          {l.done ? <span className="chip bg-good/15 text-good"><CheckCircle2 size={12} aria-hidden />Done</span> : !l.published ? <span className="chip bg-warn/15 text-warn">Draft</span> : null}
                        </div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">{l.title}</h3>
                        <p className="text-xs text-muted mt-1 flex items-center gap-1"><Clock size={12} aria-hidden />{l.minutes} min</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </motion.section>
          );
        })}
      </div>
      {teacher && <CreateLecture open={creating} onClose={() => setCreating(false)} subjects={data.subjects} onDone={reload} />}
    </>
  );
}

function CreateLecture({ open, onClose, subjects, onDone }: { open: boolean; onClose: () => void; subjects: S[]; onDone: () => void }) {
  const { toast } = useApp();
  const [f, setF] = useState({ subjectId: subjects[0]?.id ?? "", topic: "", title: "", kind: "notes" as L["kind"], url: "", notes: "", minutes: 15, published: true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await api("/api/lectures", { body: { ...f, minutes: Number(f.minutes) } });
      toast(f.published ? "Lecture published." : "Saved as draft.");
      onClose(); onDone();
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="New lecture" wide>
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
        <Field label="Subject"><select className="input" value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Topic"><input className="input" list="topics" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} required /><datalist id="topics">{subjects.find((s) => s.id === f.subjectId)?.topics.map((t) => <option key={t} value={t} />)}</datalist></Field>
        <div className="sm:col-span-2"><Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field></div>
        <Field label="Type"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as L["kind"] })}><option value="notes">Notes</option><option value="video">Video link</option><option value="link">External link</option></select></Field>
        <Field label="Minutes"><input className="input" type="number" min={1} max={240} value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} /></Field>
        {f.kind !== "notes" && <div className="sm:col-span-2"><Field label="URL"><input className="input" type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field></div>}
        <div className="sm:col-span-2"><Field label="Notes"><textarea className="input min-h-[160px]" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} required /></Field></div>
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Publish now (otherwise draft)</label>
        {err && <p role="alert" className="sm:col-span-2 text-sm text-bad font-semibold">{err}</p>}
        <button className="btn-primary sm:col-span-2" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Save lecture</button>
      </form>
    </Modal>
  );
}
