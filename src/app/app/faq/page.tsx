"use client";
import { motion } from "framer-motion";
import { CalendarPlus, Flame, HelpCircle, Search, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { Card, CardTitle, Empty, ErrorState, Grid, PageHeader, PageSkeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client";

interface Data { faq: { id: string; q: string; a: string; subject: string; topic: string; helpful: number; subjectId: string }[]; heatmap: { subjectId: string; topic: string; count: number; open: number; subject: string }[] }

export default function Faq() {
  const { me, toast } = useApp();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useApi<Data>(`/api/faq${debounced ? `?q=${encodeURIComponent(debounced)}` : ""}`);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const max = Math.max(1, ...data.heatmap.map((h) => h.count));
  const list = topic ? data.faq.filter((f) => f.topic === topic) : data.faq;
  const teacher = me?.user?.role === "teacher";

  const schedule = async (t: string) => {
    const at = new Date(); at.setDate(at.getDate() + 1); at.setHours(16, 0, 0, 0);
    await api("/api/meetings", { body: { title: `Revision session: ${t}`, kind: "live-class", at: at.toISOString(), minutes: 40 } });
    toast(`Revision session on ${t} scheduled for tomorrow 4 pm. Students were notified.`);
  };

  return (
    <>
      <PageHeader title="FAQ & Doubt Heatmap" desc="Answers your class has already found, and the topics people find most confusing." />
      <Grid className="lg:grid-cols-[1fr_380px]">
        <Card>
          <div className="relative mb-4">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input className="input !pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the FAQ…" aria-label="Search the FAQ" />
          </div>
          {topic && <button className="chip bg-primary/10 text-primary mb-3" onClick={() => setTopic(null)}>Topic: {topic} ✕</button>}
          {list.length === 0 ? <Empty icon={HelpCircle} title="No answers match" text="Try fewer words, or ask it in the Doubt Lab." action={<Link href="/app/doubts/new" className="btn-primary">Ask a doubt</Link>} /> : (
            <ul className="space-y-2.5">
              {list.map((f, i) => (
                <motion.li key={f.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <details className="group rounded-2xl border border-line/70 bg-raised p-4 open:shadow-soft">
                    <summary className="cursor-pointer list-none flex items-start justify-between gap-3">
                      <span><span className="text-xs text-muted font-semibold">{f.subject} · {f.topic}</span><span className="block font-semibold">{f.q}</span></span>
                      <span className="chip bg-good/10 text-good shrink-0"><ThumbsUp size={12} aria-hidden />{f.helpful}</span>
                    </summary>
                    <p className="mt-3 prose-read text-muted">{f.a}</p>
                    <button className="mt-2 text-sm text-primary font-semibold" onClick={async () => { await api("/api/faq", { body: { id: f.id } }); reload(); }}>This helped me</button>
                  </details>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle icon={Flame}>Doubt heatmap</CardTitle>
          <p className="text-sm text-muted mb-4">Computed from every doubt submitted. Click a topic to filter.</p>
          <ul className="space-y-2">
            {data.heatmap.map((h) => {
              const heat = h.count / max;
              return (
                <li key={h.subjectId + h.topic} className="flex items-center gap-2">
                  <button onClick={() => setTopic(h.topic)} className="flex-1 flex items-center gap-3 rounded-xl p-2.5 text-left hover:ring-2 hover:ring-primary/30 transition"
                    style={{ background: `rgba(224, ${Math.round(160 - heat * 100)}, 70, ${0.12 + heat * 0.35})` }}>
                    <span className="flex-1"><span className="font-semibold block">{h.topic}</span><span className="text-xs text-muted">{h.subject}</span></span>
                    <span className="text-sm font-bold tabular-nums">{h.count}</span>
                    <span className="sr-only">doubts, {h.open} open</span>
                  </button>
                  {teacher && <button onClick={() => schedule(h.topic)} className="btn-ghost !p-2" title="Create revision session" aria-label={`Create revision session on ${h.topic}`}><CalendarPlus size={17} /></button>}
                </li>
              );
            })}
          </ul>
        </Card>
      </Grid>
    </>
  );
}
