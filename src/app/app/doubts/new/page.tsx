"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Code2, Lightbulb, Loader2, Send, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { Field, PageHeader } from "@/components/ui";
import { Whiteboard } from "@/components/whiteboard";
import { api, useApi } from "@/lib/client";
import type { Stroke, Subject } from "@/lib/types";

interface FaqHit { id: string; q: string; a: string; subject: string; topic: string; score: number }

export default function NewDoubt() {
  const router = useRouter();
  const { toast, refreshMe, confetti } = useApp();
  const subjects = useApi<{ subjects: (Subject & { lectures: unknown[] })[] }>("/api/lectures");
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [priority, setPriority] = useState<"normal" | "exam-soon">("normal");
  const [drawing, setDrawing] = useState<Stroke[]>([]);
  const [similar, setSimilar] = useState<FaqHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subj = subjects.data?.subjects.find((s) => s.id === subjectId);
  useEffect(() => { if (subjects.data && !subjectId) { setSubjectId(subjects.data.subjects[0].id); setTopic(subjects.data.subjects[0].topics[0]); } }, [subjects.data, subjectId]);

  // duplicate detection: suggest existing FAQ answers while typing
  useEffect(() => {
    const q = `${title} ${body}`.trim();
    if (q.length < 8) { setSimilar([]); return; }
    const t = setTimeout(() => api<{ faq: FaqHit[] }>(`/api/faq?q=${encodeURIComponent(q)}`).then((r) => setSimilar(r.faq.filter((f) => f.score >= 0.34).slice(0, 3))).catch(() => {}), 350);
    return () => clearTimeout(t);
  }, [title, body]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await api<{ id: string }>("/api/doubts", { body: { subjectId, topic, title, body, code: code || undefined, priority, drawing } });
      toast("Doubt sent to your teacher.");
      confetti();
      await refreshMe();
      router.push(`/app/doubts/${r.id}`);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Ask a doubt" desc="Type it, draw it, or paste code. Be specific about where you got stuck." crumbs={[{ label: "Doubt Lab", href: "/app/doubts" }, { label: "Ask a doubt" }]} />
      <form onSubmit={submit} className="grid xl:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Subject">
                <select className="input" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopic(subjects.data?.subjects.find((s) => s.id === e.target.value)?.topics[0] ?? ""); }}>
                  {subjects.data?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Topic">
                <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>{subj?.topics.map((t) => <option key={t}>{t}</option>)}</select>
              </Field>
            </div>
            <Field label="Your question in one line">
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Why is matrix multiplication not commutative?" required minLength={6} maxLength={140} />
            </Field>
            <Field label="Details" hint="Formulas are fine as text, e.g. v^2 = u^2 + 2as or the √ π ∑ symbols from the board.">
              <textarea className="input min-h-[110px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you try? Where exactly did it stop making sense?" maxLength={4000} />
            </Field>
            {showCode ? (
              <Field label="Code snippet">
                <textarea className="input min-h-[120px] font-mono text-sm !bg-[#1b2030] !text-[#e6edf3]" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} placeholder="Paste the code that isn't working" />
              </Field>
            ) : <button type="button" className="btn-ghost text-sm" onClick={() => setShowCode(true)}><Code2 size={16} aria-hidden /> Add a code snippet</button>}
          </div>
          <div className="card p-5">
            <h2 className="font-bold mb-3">Draw it <span className="text-muted font-normal text-sm">(optional)</span></h2>
            <Whiteboard value={drawing} onChange={setDrawing} label="Your drawing" />
          </div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <AnimatePresence>
            {similar.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5 border-warn/40 bg-warn/5">
                <h2 className="font-bold flex items-center gap-2 mb-2"><Lightbulb size={18} className="text-warn" aria-hidden /> This might already be answered</h2>
                <ul className="space-y-3">
                  {similar.map((f) => (
                    <li key={f.id} className="text-sm">
                      <p className="font-semibold">{f.q}</p>
                      <p className="text-muted mt-0.5">{f.a}</p>
                      <button type="button" className="mt-1 text-primary font-semibold text-xs flex items-center gap-1" onClick={() => { api("/api/faq", { body: { id: f.id } }); toast("Glad it helped!"); router.push("/app/faq"); }}><ThumbsUp size={12} aria-hidden /> This answers my question</button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="card p-5 space-y-4">
            <fieldset>
              <legend className="label">Priority</legend>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: "normal", l: "Normal" }, { v: "exam-soon", l: "Exam soon" }].map((o) => (
                  <label key={o.v} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold cursor-pointer text-center transition ${priority === o.v ? "border-primary bg-primary/10 text-primary" : "border-line"}`}>
                    <input type="radio" name="priority" className="sr-only" checked={priority === o.v} onChange={() => setPriority(o.v as typeof priority)} />{o.l}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p role="alert" className="text-sm text-bad font-semibold">{error}</p>}
            <button className="btn-primary w-full !py-3" disabled={busy || title.trim().length < 6}>{busy ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Send size={17} aria-hidden />} Send to teacher</button>
            <p className="text-xs text-muted">Only you and your teachers can see this doubt. Parents can't.</p>
          </div>
        </aside>
      </form>
    </>
  );
}
