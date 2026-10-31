"use client";
import { motion } from "framer-motion";
import { BookOpenCheck, CheckCircle2, Clock, ExternalLink, Glasses, Lightbulb, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { ErrorState, PageHeader, PageSkeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client";
import type { Lecture, Subject } from "@/lib/types";

interface Data { lecture: Lecture; subject: Subject; done: boolean; practice: { id: string; q: string; options: string[]; hint: string }[]; related: { id: string; title: string }[] }

export default function LecturePage({ params }: { params: { id: string } }) {
  const { data, error, loading, reload } = useApi<Data>(`/api/lectures/${params.id}`);
  const { toast, refreshMe, sfx } = useApp();
  const [reading, setReading] = useState(false);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const l = data.lecture;
  const complete = async () => {
    const r = await api<{ coins: number }>(`/api/lectures/${l.id}`, { method: "POST" });
    toast(r.coins ? `Marked complete. +${r.coins} coins` : "Marked complete.");
    sfx("good"); reload(); refreshMe();
  };
  const body = (
    <article className={`prose-read text-[1.05rem] ${reading ? "mx-auto" : ""}`}>
      {l.notes.split("\n\n").map((p, i) => p.startsWith("- ") || p.includes("\n- ") ? (
        <ul key={i} className="list-disc pl-6 mb-4 space-y-1">{p.split("\n").map((li) => <li key={li}>{li.replace(/^- /, "")}</li>)}</ul>
      ) : <p key={i}>{p}</p>)}
    </article>
  );
  if (reading) {
    return (
      <div className="fixed inset-0 z-[70] overflow-auto bg-bg">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <button className="btn-outline mb-8" onClick={() => setReading(false)}><Glasses size={16} aria-hidden /> Exit reading mode</button>
          <h1 className="text-3xl font-extrabold mb-6">{l.title}</h1>
          {body}
        </div>
      </div>
    );
  }
  return (
    <>
      <PageHeader title={l.title} desc={`${data.subject.name} · ${l.topic}`} crumbs={[{ label: "Library", href: "/app/library" }, { label: data.subject.name, href: `/app/library#${data.subject.id}` }, { label: l.topic }]}
        action={<>
          <button className="btn-outline" onClick={() => setReading(true)}><Glasses size={16} aria-hidden /> Reading mode</button>
          <button className={data.done ? "btn-soft" : "btn-primary"} onClick={complete} disabled={data.done}>{data.done ? <><CheckCircle2 size={16} aria-hidden /> Completed</> : <><BookOpenCheck size={16} aria-hidden /> Mark complete</>}</button>
        </>} />
      <div className="grid xl:grid-cols-[1fr_340px] gap-5">
        <section className="card p-6 md:p-8">
          <p className="text-sm text-muted mb-5 flex items-center gap-1.5"><Clock size={14} aria-hidden />{l.minutes} min read</p>
          {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="btn-soft mb-6"><ExternalLink size={16} aria-hidden /> Open {l.kind === "video" ? "video" : "resource"}</a>}
          {body}
        </section>
        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold mb-3">Practice</h2>
            {data.practice.length === 0 ? <p className="text-sm text-muted">No practice questions on this topic yet.</p> : data.practice.map((q) => <Practice key={q.id} q={q} lectureId={l.id} />)}
          </section>
          {data.related.length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold mb-2">Related lectures</h2>
              <ul className="space-y-1">{data.related.map((r) => <li key={r.id}><Link className="text-primary font-semibold text-sm hover:underline" href={`/app/library/${r.id}`}>{r.title}</Link></li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function Practice({ q, lectureId }: { q: { id: string; q: string; options: string[]; hint: string }; lectureId: string }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [res, setRes] = useState<{ correct: boolean; answer: number; explanation: string } | null>(null);
  const [hint, setHint] = useState(false);
  const { sfx } = useApp();
  const check = async (k: number) => {
    setChoice(k);
    const r = await api<typeof res>(`/api/lectures/${lectureId}`, { method: "PUT", body: { qid: q.id, choice: k } });
    setRes(r); sfx(r?.correct ? "good" : "bad");
  };
  return (
    <div className="mb-5 last:mb-0">
      <p className="font-semibold mb-2">{q.q}</p>
      <div className="space-y-1.5">
        {q.options.map((o, k) => {
          const st = res ? (k === res.answer ? "right" : k === choice ? "wrong" : "") : "";
          return (
            <motion.button key={k} onClick={() => !res && check(k)} disabled={!!res} animate={st === "wrong" ? { x: [0, -5, 5, 0] } : undefined}
              className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left ${st === "right" ? "border-good bg-good/10" : st === "wrong" ? "border-bad bg-bad/10" : "border-line hover:border-primary/40"}`}>
              {st === "right" ? <CheckCircle2 size={15} className="text-good" aria-label="Correct" /> : st === "wrong" ? <XCircle size={15} className="text-bad" aria-label="Incorrect" /> : null}{o}
            </motion.button>
          );
        })}
      </div>
      {!res && <button className="text-xs text-primary font-semibold mt-2 flex items-center gap-1" onClick={() => setHint(true)}><Lightbulb size={12} aria-hidden /> Hint</button>}
      {hint && !res && <p className="text-xs text-muted mt-1">{q.hint}</p>}
      {res && <p className="text-sm mt-2 text-muted">{res.explanation}</p>}
    </div>
  );
}
