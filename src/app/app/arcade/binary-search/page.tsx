"use client";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Gem, Lightbulb, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Feedback, GameHeader, ResultCard, StatPill, useGame } from "@/components/game-kit";

interface View { n: number; target: number; lo: number; hi: number; optimal: number; revealed: Record<number, number> }
type Move = { value: number; verdict: "found" | "go-left" | "go-right"; lo: number; hi: number };

export default function BinarySearchGame() {
  const [level, setLevel] = useState(1);
  const g = useGame<View>("binary-search");
  const [steps, setSteps] = useState(0);
  const [found, setFound] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [last, setLast] = useState<number | null>(null);

  const newRound = (lv = level) => { setSteps(0); setFound(null); setHint(false); setLast(null); g.start(lv); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { newRound(level); }, [level]);

  const v = g.view;
  const open = async (i: number) => {
    if (!v || g.busy || found !== null || v.revealed[i] !== undefined) return;
    const r = await g.move<Move>({ index: i });
    if (!r) return;
    if (!r.ok) return;
    setSteps((s) => s + 1);
    setLast(i);
    setHint(false);
    g.setView({ ...v, lo: r.lo, hi: r.hi, revealed: { ...v.revealed, [i]: r.value } });
    if (r.verdict === "found") { setFound(i); g.setFeedback({ ok: true, text: `Treasure ${v.target} found in box ${i + 1}!`, key: Date.now() }); }
    else g.setFeedback({ ok: true, text: r.verdict === "go-right" ? `${r.value} is smaller than ${v.target}. The treasure is to the right →` : `${r.value} is bigger than ${v.target}. The treasure is to the left ←`, key: Date.now() });
  };

  const mid = v ? Math.floor((v.lo + v.hi) / 2) : -1;
  return (
    <>
      <GameHeader title="Binary Search Treasure Hunt" subtitle="The boxes are sorted from smallest to largest. Open the middle box, then decide: left or right? Match the optimal number of steps for bonus coins." level={level} setLevel={setLevel} onRestart={() => newRound()} />
      {g.finished ? (
        <ResultCard f={g.finished} onAgain={() => newRound()} onNext={level < 3 ? () => setLevel(level + 1) : undefined} />
      ) : (
        <div className="card p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2.5 mb-5">
            <div className="rounded-2xl bg-warn/15 text-warn px-4 py-2.5 flex items-center gap-2.5">
              <Gem size={22} aria-hidden />
              <div><div className="text-xs font-semibold uppercase tracking-wide">Find treasure</div><div className="font-display text-2xl font-extrabold tabular-nums">{v?.target ?? "…"}</div></div>
            </div>
            <StatPill label="Steps" value={steps} />
            <StatPill label="Optimal" value={v?.optimal ?? "–"} />
            <StatPill label="Search range" value={v ? `${v.lo + 1}–${v.hi + 1}` : "–"} />
            <button className="btn-soft ml-auto" onClick={() => setHint(true)} disabled={!v || found !== null}><Lightbulb size={16} aria-hidden /> Show me the middle</button>
          </div>
          <Feedback fb={g.feedback} />
          {!v ? <div className="skeleton h-40" /> : (
            <div className={`grid gap-1.5 md:gap-2 mt-2 ${v.n <= 15 ? "grid-cols-5 sm:grid-cols-8 md:grid-cols-[repeat(15,minmax(0,1fr))]" : v.n <= 31 ? "grid-cols-8 md:grid-cols-[repeat(16,minmax(0,1fr))]" : "grid-cols-8 sm:grid-cols-[repeat(16,minmax(0,1fr))]"}`} role="group" aria-label="Treasure boxes">
              {Array.from({ length: v.n }, (_, i) => {
                const inRange = i >= v.lo && i <= v.hi;
                const val = v.revealed[i];
                const isFound = found === i;
                const isMid = hint && i === mid;
                return (
                  <motion.button key={i} layout onClick={() => open(i)} disabled={found !== null || val !== undefined}
                    whileHover={inRange && val === undefined ? { y: -4 } : undefined} whileTap={{ scale: 0.92 }}
                    animate={isFound ? { scale: [1, 1.25, 1.1], rotate: [0, -6, 6, 0] } : last === i ? { y: [0, -8, 0] } : undefined}
                    aria-label={`Box ${i + 1}${val !== undefined ? `, holds ${val}` : inRange ? ", closed" : ", ruled out"}`}
                    className={`relative aspect-[4/5] rounded-xl border-2 font-display font-extrabold text-sm md:text-base grid place-items-center transition-colors
                      ${isFound ? "bg-warn text-white border-warn shadow-lift" : val !== undefined ? "bg-ink/5 border-line text-ink" : inRange ? "bg-[#9a6b45] border-[#6b4a2f] text-[#ffe2a8] shadow-clay hover:brightness-110" : "bg-ink/5 border-transparent text-muted/50"}
                      ${isMid ? "ring-4 ring-primary ring-offset-2 ring-offset-surface" : ""}`}>
                    {isFound ? <Gem size={20} aria-hidden /> : val !== undefined ? val : inRange ? <span className="text-[0.65rem] md:text-xs opacity-80">{i + 1}</span> : <Lock size={12} aria-hidden />}
                  </motion.button>
                );
              })}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-[#9a6b45]" aria-hidden /> Could still hold the treasure</span>
            <span className="flex items-center gap-1.5"><Lock size={13} aria-hidden /> Ruled out</span>
            <span className="flex items-center gap-1.5"><ArrowLeft size={13} aria-hidden /><ArrowRight size={13} aria-hidden /> Each box you open halves the range</span>
          </div>
        </div>
      )}
    </>
  );
}
