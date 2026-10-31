"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CheckCircle2, Eye, HeartHandshake, HelpCircle, Lightbulb, Loader2, Save, Send, Sparkles, ThumbsUp, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers";
import { Avatar, Empty, ErrorState, Field, Modal, PageHeader, PageSkeleton, StatusBadge } from "@/components/ui";
import { Whiteboard } from "@/components/whiteboard";
import { api, fmtDateTime, timeAgo, useApi } from "@/lib/client";
import type { Doubt, DoubtStatus, Stroke } from "@/lib/types";

type Full = Omit<Doubt, "replies"> & { subject: string; student: string; helpedCount: number; helpedByMe: boolean; replies: { id: string; text: string; at: string; author: string; role: string }[] };

export default function DoubtDetail({ params }: { params: { id: string } }) {
  const { data, error, loading, reload } = useApi<{ doubt: Full; me: string }>(`/api/doubts/${params.id}`, 5000);
  const { toast, refreshMe, sfx } = useApp();
  const [reply, setReply] = useState("");
  const [annotation, setAnnotation] = useState<Stroke[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => { if (data && annotation === null) setAnnotation(data.doubt.annotation); }, [data, annotation]);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const d = data.doubt;
  const teacher = data.me === "teacher";
  const dirty = teacher && annotation !== null && JSON.stringify(annotation) !== JSON.stringify(d.annotation);

  const patch = async (body: Record<string, unknown>, msg?: string) => {
    try {
      await api(`/api/doubts/${d.id}`, { method: "PATCH", body });
      if (msg) toast(msg);
      await reload();
      refreshMe();
    } catch (e) { toast((e as Error).message, "err"); }
  };
  const send = async () => {
    if (!reply.trim()) return;
    await patch({ action: "reply", text: reply }, "Reply sent.");
    setReply("");
    sfx("good");
  };
  const saveAnnotation = async () => {
    setSaving(true);
    await patch({ action: "annotate", annotation: annotation ?? [] }, "Annotation saved. The student can see it now.");
    setSaving(false);
  };

  return (
    <>
      <PageHeader title={d.title} desc={`${d.subject} · ${d.topic} · asked by ${d.student} ${timeAgo(d.createdAt)}`} crumbs={[{ label: "Doubt Lab", href: "/app/doubts" }, { label: d.topic }]}
        action={<StatusBadge status={d.status} />} />
      <div className="grid xl:grid-cols-[1fr_380px] gap-5">
        <div className="space-y-5">
          {(d.body || d.code) && (
            <section className="card p-5">
              {d.body && <p className="whitespace-pre-wrap prose-read">{d.body}</p>}
              {d.code && <pre className="mt-3 rounded-xl bg-[#1b2030] text-[#e6edf3] p-4 overflow-x-auto text-sm"><code>{d.code}</code></pre>}
            </section>
          )}
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-bold">{teacher ? "Annotate the student's drawing" : d.annotation.length ? "Your drawing, annotated by your teacher" : "Your drawing"}</h2>
              {teacher && <button className="btn-primary text-sm" onClick={saveAnnotation} disabled={!dirty || saving}>{saving ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />} {dirty ? "Save annotation" : "Saved"}</button>}
            </div>
            {d.drawing.length === 0 && d.annotation.length === 0 && !teacher ? (
              <p className="text-muted text-sm">No drawing attached to this doubt.</p>
            ) : teacher ? (
              <Whiteboard value={annotation ?? []} onChange={setAnnotation} background={d.drawing} backgroundLabel={`${d.student}'s drawing`} label="Teacher annotation" inkColor="#d64545" />
            ) : (
              <Whiteboard value={d.annotation} background={d.drawing} backgroundLabel="your drawing" readOnly label="Annotated drawing" />
            )}
            {!teacher && d.annotation.length > 0 && <p className="text-sm text-muted mt-2">Press play on the board to watch the explanation stroke by stroke.</p>}
          </section>

          <section className="card p-5" aria-labelledby="thread">
            <h2 id="thread" className="font-bold mb-4">Conversation</h2>
            {d.replies.length === 0 ? <p className="text-muted text-sm mb-4">{teacher ? "No replies yet. Your answer goes here." : "Your teacher hasn't replied yet. You'll get a notification when they do."}</p> : (
              <ol className="space-y-4 mb-5">
                <AnimatePresence initial={false}>
                  {d.replies.map((r) => (
                    <motion.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${r.role === "teacher" ? "" : "flex-row-reverse text-right"}`}>
                      <Avatar name={r.author} size={34} />
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${r.role === "teacher" ? "bg-primary/10" : "bg-ink/5"}`}>
                        <p className="text-xs font-bold mb-0.5">{r.author} <span className="font-normal text-muted">· {r.role} · {fmtDateTime(r.at)}</span></p>
                        <p className="whitespace-pre-wrap text-left">{r.text}</p>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            )}
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="reply">Write a reply</label>
              <textarea id="reply" className="input min-h-[52px]" value={reply} onChange={(e) => setReply(e.target.value)} placeholder={teacher ? "Explain the idea, or ask for more detail…" : "Add a follow-up…"}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
              <button className="btn-primary self-end" onClick={send} disabled={!reply.trim()} aria-label="Send reply"><Send size={17} /></button>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold mb-3">Status</h2>
            {teacher ? (
              <div className="grid grid-cols-1 gap-1.5">
                {(["pending", "reviewing", "answered", "next-class", "resolved"] as DoubtStatus[]).map((s) => (
                  <button key={s} onClick={() => patch({ action: "status", status: s }, `Marked ${s.replace("-", " ")}.`)}
                    className={`rounded-xl px-3 py-2 text-left transition border ${d.status === s ? "border-primary bg-primary/10" : "border-transparent hover:bg-ink/5"}`} aria-pressed={d.status === s}>
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <StatusBadge status={d.status} />
                {d.status !== "resolved" && d.replies.some((r) => r.role === "teacher") && (
                  <button className="btn-soft w-full" onClick={() => patch({ action: "status", status: "resolved" }, "Marked resolved. Nice work!")}><CheckCircle2 size={16} aria-hidden /> This solved it</button>
                )}
              </div>
            )}
            <button className={`btn-outline w-full mt-4 ${d.helpedByMe ? "!border-good text-good" : ""}`} onClick={() => patch({ action: "helped" })} aria-pressed={d.helpedByMe}>
              <ThumbsUp size={16} aria-hidden /> This helped me · {d.helpedCount}
            </button>
            {teacher && (
              <button className="btn-soft w-full mt-2" onClick={() => setFaqOpen(true)} disabled={d.inFaq}><Upload size={16} aria-hidden /> {d.inFaq ? "Published to FAQ" : "Publish to FAQ"}</button>
            )}
          </section>
          {!teacher && <GuidedHelp subjectId={d.subjectId} topic={d.topic} />}
        </aside>
      </div>
      <PublishFaq open={faqOpen} onClose={() => setFaqOpen(false)} q={d.title} a={[...d.replies].reverse().find((r) => r.role === "teacher")?.text ?? ""} onPublish={(q, a) => patch({ action: "faq", q, a }, "Published to the class FAQ.").then(() => setFaqOpen(false))} />
    </>
  );
}

function PublishFaq({ open, onClose, q, a, onPublish }: { open: boolean; onClose: () => void; q: string; a: string; onPublish: (q: string, a: string) => void }) {
  const [qq, setQ] = useState(q);
  const [aa, setA] = useState(a);
  useEffect(() => { if (open) { setQ(q); setA(a); } }, [open, q, a]);
  return (
    <Modal open={open} onClose={onClose} title="Publish to FAQ">
      <p className="text-sm text-muted mb-4">The student's name is never shown in the FAQ.</p>
      <div className="space-y-3">
        <Field label="Question"><input className="input" value={qq} onChange={(e) => setQ(e.target.value)} /></Field>
        <Field label="Answer"><textarea className="input min-h-[120px]" value={aa} onChange={(e) => setA(e.target.value)} /></Field>
        <button className="btn-primary w-full" disabled={qq.trim().length < 5 || aa.trim().length < 5} onClick={() => onPublish(qq, aa)}>Publish</button>
      </div>
    </Modal>
  );
}

interface Lib { subjects: { id: string; lectures: { id: string; title: string; topic: string }[] }[] }
interface Practice { id: string; q: string; options: string[]; hint: string }

/** Guided resolution from stored teacher content only. No AI provider is configured, so nothing is generated. */
function GuidedHelp({ subjectId, topic }: { subjectId: string; topic: string }) {
  const lib = useApi<Lib>("/api/lectures");
  const faq = useApi<{ faq: { id: string; q: string; a: string; topic: string }[] }>(`/api/faq?subject=${subjectId}`);
  const lecture = useMemo(() => lib.data?.subjects.find((s) => s.id === subjectId)?.lectures.find((l) => l.topic === topic), [lib.data, subjectId, topic]);
  const lecData = useApi<{ practice: Practice[] }>(lecture ? `/api/lectures/${lecture.id}` : null);
  const q = lecData.data?.practice[0];
  const related = faq.data?.faq.filter((f) => f.topic === topic).slice(0, 2) ?? [];
  const [mode, setMode] = useState<"hint" | "try" | "check" | "full" | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [res, setRes] = useState<{ correct: boolean; answer: number; explanation: string } | null>(null);
  const check = async () => {
    if (choice === null || !q || !lecture) return;
    setRes(await api(`/api/lectures/${lecture.id}`, { method: "PUT", body: { qid: q.id, choice } }));
    setMode("check");
  };
  return (
    <section className="card p-5">
      <h2 className="font-bold flex items-center gap-2 mb-1"><HeartHandshake size={18} className="text-primary" aria-hidden /> Guided help</h2>
      <p className="text-xs text-muted mb-4">From your teacher's lectures and the class FAQ. AI help is off because no AI service is set up on this server.</p>
      <div className="space-y-2">
        {lecture ? <Link href={`/app/library/${lecture.id}`} className="btn-outline w-full !justify-start"><BookOpen size={16} aria-hidden /> Explain the concept: {lecture.title}</Link> : <p className="text-sm text-muted">No lecture for this topic yet.</p>}
        {related.map((f) => (
          <details key={f.id} className="rounded-xl bg-ink/5 px-3 py-2 text-sm">
            <summary className="font-semibold cursor-pointer">Similar: {f.q}</summary>
            <p className="mt-1 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
      {q ? (
        <div className="mt-5 pt-4 border-t border-line/60">
          <p className="text-xs font-bold uppercase text-muted tracking-wide mb-1">Practise the idea</p>
          <p className="font-semibold mb-2">{q.q}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button className="btn-ghost text-xs !px-2.5 !py-1.5" onClick={() => setMode("hint")}><Lightbulb size={14} aria-hidden /> Give me a hint</button>
            <button className="btn-ghost text-xs !px-2.5 !py-1.5" onClick={() => setMode("try")}><Sparkles size={14} aria-hidden /> Let me try</button>
          </div>
          {mode === "hint" && <p className="text-sm bg-warn/10 rounded-xl p-3">{q.hint}</p>}
          {(mode === "try" || mode === "check" || mode === "full") && (
            <div className="space-y-1.5">
              {q.options.map((o, k) => (
                <label key={k} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${res && k === res.answer ? "border-good bg-good/10" : choice === k ? "border-primary" : "border-line"}`}>
                  <input type="radio" name="gq" checked={choice === k} onChange={() => { setChoice(k); setRes(null); }} /> {o}
                </label>
              ))}
              <div className="flex gap-1.5 pt-1">
                <button className="btn-soft text-xs" onClick={check} disabled={choice === null}><HelpCircle size={14} aria-hidden /> Check my answer</button>
                <button className="btn-ghost text-xs" onClick={async () => { if (!lecture) return; setRes(await api(`/api/lectures/${lecture.id}`, { method: "PUT", body: { qid: q.id, choice: choice ?? -1 } })); setMode("full"); }}><Eye size={14} aria-hidden /> Show full explanation</button>
              </div>
              {res && <p className={`text-sm rounded-xl p-3 ${mode === "full" || res.correct ? "bg-good/10" : "bg-bad/10"}`}>{mode === "check" && <b>{res.correct ? "Correct! " : "Not yet. "}</b>}{mode === "full" || res.correct ? res.explanation : "Try another option, or ask for a hint."}</p>}
            </div>
          )}
        </div>
      ) : lecture ? null : <Empty icon={Lightbulb} title="Your teacher will guide you" text="There's no stored practice for this topic yet." />}
    </section>
  );
}
