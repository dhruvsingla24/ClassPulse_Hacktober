"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Coins, Flame, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "./providers";
import { Segmented } from "./ui";

export interface Finished { coins: number; xp: number; steps: number; optimal: number; mistakes: number; note?: string; duplicate?: boolean; streak: { current: number }; achievements: string[] }

/** Start/move helpers shared by every Arcade game. The server holds the real state. */
export function useGame<V>(game: string) {
  const { toast, sfx, confetti, refreshMe } = useApp();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [view, setView] = useState<V | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string; key: number } | null>(null);

  const start = useCallback(async (level: number, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const r = await api<{ attemptId: string; view: V }>("/api/arcade/start", { body: { game, level, ...extra } });
      setAttemptId(r.attemptId); setView(r.view); setFinished(null); setFeedback(null);
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  }, [game, toast]);

  const move = useCallback(async <R,>(body: Record<string, unknown>): Promise<(R & { ok: boolean; reason?: string; finished?: Finished }) | null> => {
    if (!attemptId) return null;
    setBusy(true);
    try {
      const r = await api<R & { ok: boolean; reason?: string; finished?: Finished }>("/api/arcade/move", { body: { attemptId, ...body } });
      if (!r.ok) { sfx("bad"); setFeedback({ ok: false, text: r.reason ?? "Not allowed.", key: Date.now() }); }
      else sfx("click");
      if (r.finished) {
        setFinished(r.finished);
        if (r.finished.coins > 0 && !r.finished.duplicate) { sfx("coin"); confetti(); }
        refreshMe();
      }
      return r;
    } catch (e) { toast((e as Error).message, "err"); return null; } finally { setBusy(false); }
  }, [attemptId, sfx, confetti, refreshMe, toast]);

  return { attemptId, view, setView, finished, busy, start, move, feedback, setFeedback };
}

export function GameHeader({ title, subtitle, level, setLevel, onRestart, children }: { title: string; subtitle: string; level: number; setLevel: (n: number) => void; onRestart: () => void; children?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <nav className="text-sm text-muted mb-2" aria-label="Breadcrumb"><Link href="/app/arcade" className="hover:text-ink">Learning Arcade</Link> / Algorithm Arena</nav>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{title}</h1>
          <p className="text-muted mt-1 max-w-2xl">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {children}
          <Segmented label="Level" value={String(level) as "1" | "2" | "3"} onChange={(v) => setLevel(Number(v))} options={[{ value: "1", label: "Level 1" }, { value: "2", label: "Level 2" }, { value: "3", label: "Level 3" }]} />
          <button className="btn-outline" onClick={onRestart}><RotateCcw size={16} aria-hidden /> New round</button>
        </div>
      </div>
    </div>
  );
}

export function StatPill({ label, value, tone = "" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className={`rounded-2xl bg-raised border border-line/70 px-4 py-2.5 ${tone}`}>
      <div className="text-xs text-muted font-semibold uppercase tracking-wide">{label}</div>
      <div className="font-display text-xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

export function Feedback({ fb }: { fb: { ok: boolean; text: string; key: number } | null }) {
  return (
    <div aria-live="polite" className="min-h-[3rem]">
      <AnimatePresence mode="wait">
        {fb && (
          <motion.p key={fb.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, x: fb.ok ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ${fb.ok ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>
            {fb.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ResultCard({ f, onAgain, onNext, extra }: { f: Finished; onAgain: () => void; onNext?: () => void; extra?: React.ReactNode }) {
  const perfect = f.steps <= f.optimal && f.mistakes === 0;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="card p-6 md:p-8 text-center relative overflow-hidden" role="status">
      <div className="absolute inset-0 bg-gradient-to-b from-warn/10 to-transparent" aria-hidden />
      <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: "spring" }} className="relative mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-warn/20 text-warn shadow-clay">
        <Trophy size={36} aria-hidden />
      </motion.div>
      <h2 className="relative mt-4 text-2xl font-extrabold">{perfect ? "Flawless!" : "Level cleared!"}</h2>
      <div className="relative mt-4 flex flex-wrap justify-center gap-2.5">
        <StatPill label="Your steps" value={f.steps} />
        <StatPill label="Optimal" value={f.optimal} />
        <StatPill label="Mistakes" value={f.mistakes} />
      </div>
      <div className="relative mt-5 flex flex-wrap justify-center gap-3 text-lg">
        {f.coins > 0 ? (
          <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.25, 1] }} transition={{ delay: 0.35 }} className="chip bg-warn/15 text-warn !text-base !px-4 !py-2"><Coins size={18} aria-hidden /> +{f.coins} coins</motion.span>
        ) : null}
        <span className="chip bg-accent/15 text-accent !text-base !px-4 !py-2"><Flame size={18} aria-hidden /> {f.streak.current}-day streak</span>
      </div>
      {f.duplicate && <p className="relative mt-3 text-sm text-muted">This round was already rewarded, so no extra coins were added.</p>}
      {f.note && <p className="relative mt-3 text-sm text-muted">{f.note}</p>}
      {f.achievements.length > 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="relative mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary/10 text-primary px-4 py-2 font-bold">
          <Award size={18} aria-hidden /> Achievement unlocked: {f.achievements.join(", ")}
        </motion.p>
      )}
      {extra}
      <div className="relative mt-6 flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={onAgain}><RotateCcw size={16} aria-hidden /> Play again</button>
        {onNext && <button className="btn-soft" onClick={onNext}>Next level</button>}
        <Link href="/app/arcade" className="btn-ghost">Back to the Arcade</Link>
      </div>
    </motion.div>
  );
}
