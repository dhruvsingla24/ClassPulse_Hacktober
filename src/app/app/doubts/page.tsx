"use client";
import { motion } from "framer-motion";
import { AlertTriangle, Image as ImageIcon, MessageCircleQuestion, MessagesSquare, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { Empty, ErrorState, PageHeader, PageSkeleton, Segmented, StatusBadge } from "@/components/ui";
import { timeAgo, useApi } from "@/lib/client";
import type { DoubtStatus } from "@/lib/types";

interface Row { id: string; title: string; topic: string; status: DoubtStatus; priority: string; createdAt: string; subject: string; student?: string; replies: number; hasDrawing: boolean; annotated: boolean }

export default function Doubts() {
  const { me } = useApp();
  const teacher = me?.user?.role === "teacher";
  const { data, error, loading, reload } = useApi<{ doubts: Row[] }>("/api/doubts", 8000);
  const [filter, setFilter] = useState<"open" | "all" | "resolved">("open");
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const rows = data.doubts.filter((d) => filter === "all" || (filter === "resolved" ? d.status === "resolved" : d.status !== "resolved"));
  const open = data.doubts.filter((d) => d.status !== "resolved").length;
  return (
    <>
      <PageHeader title="Doubt Solving Lab" desc={teacher ? "Every question your class asked, newest first. Exam-soon doubts are flagged." : "Ask anything: type it, draw it, paste code. Your teacher answers right on your drawing."}
        action={!teacher && <Link href="/app/doubts/new" className="btn-primary"><Plus size={17} aria-hidden /> Ask a doubt</Link>} />

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative card overflow-hidden mb-5 p-6 !border-0 text-white" style={{ background: "linear-gradient(135deg,#1f3d36 0%,#24524a 50%,#2e6b5c 100%)" }}>
        <div className="absolute right-6 top-6 hidden md:flex gap-2" aria-hidden>
          {["#ff6b6b", "#ffd166", "#06d6a0"].map((c, i) => <motion.span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.3 }} />)}
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/15 backdrop-blur"><MessageCircleQuestion size={30} aria-hidden /></div>
          <div className="flex-1">
            <p className="text-white/70 text-sm font-semibold uppercase tracking-wider">Smartboard status</p>
            <p className="font-display text-3xl font-extrabold">{open} open {open === 1 ? "doubt" : "doubts"}</p>
            <p className="text-white/80 text-sm">{teacher ? "Annotate a drawing, reply, then publish the best answers to the FAQ." : "Before you ask, we check the FAQ for an existing answer."}</p>
          </div>
          <Link href="/app/faq" className="btn bg-white/15 hover:bg-white/25 text-white"><Sparkles size={16} aria-hidden /> FAQ & heatmap</Link>
        </div>
      </motion.section>

      <div className="mb-4"><Segmented label="Filter doubts" value={filter} onChange={setFilter} options={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "all", label: "All" }]} /></div>
      {rows.length === 0 ? (
        <div className="card"><Empty icon={MessageCircleQuestion} title={filter === "open" ? "No open doubts" : "Nothing here yet"} text={teacher ? "Your class is all caught up." : "Stuck on something? Ask it, even if it feels small."} action={!teacher && <Link href="/app/doubts/new" className="btn-primary"><Plus size={16} aria-hidden /> Ask a doubt</Link>} /></div>
      ) : (
        <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="space-y-2.5">
          {rows.map((d) => (
            <motion.li key={d.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Link href={`/app/doubts/${d.id}`} className="card card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="chip bg-ink/5 text-muted">{d.subject} · {d.topic}</span>
                    {d.priority === "exam-soon" && <span className="chip bg-bad/15 text-bad"><AlertTriangle size={12} aria-hidden /> Exam soon</span>}
                    {d.hasDrawing && <span className="chip bg-primary/10 text-primary"><ImageIcon size={12} aria-hidden /> Drawing{d.annotated ? " · annotated" : ""}</span>}
                  </div>
                  <h2 className="font-bold truncate">{d.title}</h2>
                  <p className="text-sm text-muted">{d.student ? `${d.student} · ` : ""}{timeAgo(d.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-muted flex items-center gap-1"><MessagesSquare size={15} aria-hidden />{d.replies}</span>
                  <StatusBadge status={d.status} />
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </>
  );
}
