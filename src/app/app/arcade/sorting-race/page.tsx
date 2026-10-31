"use client";
import { motion } from "framer-motion";
import { Lightbulb, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Feedback, GameHeader, ResultCard, StatPill, useGame } from "@/components/game-kit";
import { Segmented } from "@/components/ui";

type Mode = "bubble" | "selection" | "insertion";
interface View { arr: number[]; mode: Mode; optimal: number; swaps: number }

const RULES: Record<Mode, string> = {
  bubble: "Swap neighbouring blocks that are out of order. Big blocks bubble to the right.",
  selection: "Find the smallest unsorted block and swap it into the next position.",
  insertion: "Grow a sorted left side. Swap each new block left until it fits.",
};

function hintFor(arr: number[], mode: Mode): [number, number] | null {
  if (mode === "selection") {
    for (let i = 0; i < arr.length; i++) {
      let m = i;
      for (let j = i + 1; j < arr.length; j++) if (arr[j] < arr[m]) m = j;
      if (m !== i) return [i, m];
    }
    return null;
  }
  for (let i = 0; i < arr.length - 1; i++) if (arr[i] > arr[i + 1]) return [i, i + 1];
  return null;
}

export default function SortingRace() {
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode>("bubble");
  const g = useGame<View>("sorting-race");
  const [sel, setSel] = useState<number | null>(null);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [history, setHistory] = useState<number[][]>([]);
  const [replay, setReplay] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  const newRound = (lv = level, m = mode) => { setSel(null); setHint(null); setReplay(null); g.start(lv, { mode: m }).then(() => setHistory([])); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { newRound(level, mode); }, [level, mode]);
  useEffect(() => { if (g.view && history.length === 0) setHistory([g.view.arr.slice()]); }, [g.view, history.length]);
  useEffect(() => {
    if (replay === null) return;
    if (replay >= history.length - 1) { const t = setTimeout(() => setReplay(null), 1200); return () => clearTimeout(t); }
    const t = setTimeout(() => setReplay((r) => (r === null ? null : r + 1)), 650);
    return () => clearTimeout(t);
  }, [replay, history.length]);

  const v = g.view;
  const swap = async (i: number, j: number) => {
    if (!v || g.busy) return;
    setSel(null); setHint(null);
    const r = await g.move<{ arr: number[]; sorted: boolean }>({ i, j });
    if (r?.ok) {
      g.setView({ ...v, arr: r.arr, swaps: v.swaps + 1 });
      setHistory((h) => [...h, r.arr.slice()]);
      g.setFeedback({ ok: true, text: r.sorted ? "Sorted!" : "Good swap.", key: Date.now() });
    }
  };
  const click = (i: number) => {
    if (sel === null) setSel(i);
    else if (sel === i) setSel(null);
    else swap(sel, i);
  };

  const arr = replay !== null ? history[replay] : v?.arr ?? [];
  const max = Math.max(1, ...arr);
  return (
    <>
      <GameHeader title="Sorting Race" subtitle="Pick two blocks to swap them (or drag one onto another). Follow the rules of the algorithm you choose. Every move is checked on the server." level={level} setLevel={setLevel} onRestart={() => newRound()}>
        <Segmented label="Algorithm" value={mode} onChange={setMode} options={[{ value: "bubble", label: "Bubble" }, { value: "selection", label: "Selection" }, { value: "insertion", label: "Insertion" }]} />
      </GameHeader>
      {g.finished && replay === null ? (
        <ResultCard f={g.finished} onAgain={() => newRound()} onNext={level < 3 ? () => setLevel(level + 1) : undefined}
          extra={<button className="btn-outline mt-5 relative" onClick={() => setReplay(0)}><Play size={16} aria-hidden /> Watch step-by-step replay</button>} />
      ) : (
        <div className="card p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <StatPill label="Swaps" value={v?.swaps ?? 0} />
            <StatPill label="Optimal" value={v?.optimal ?? "–"} />
            <p className="text-sm text-muted flex-1 min-w-[200px]">{RULES[mode]}</p>
            {replay === null ? (
              <button className="btn-soft" onClick={() => v && setHint(hintFor(v.arr, mode))} disabled={!v}><Lightbulb size={16} aria-hidden /> Hint</button>
            ) : (
              <button className="btn-soft" onClick={() => setReplay(null)}><Pause size={16} aria-hidden /> Stop replay ({replay + 1}/{history.length})</button>
            )}
          </div>
          <Feedback fb={g.feedback} />
          <div className="flex items-end justify-center gap-2 md:gap-3 h-64 md:h-72 mt-2 px-1" role="group" aria-label="Blocks to sort">
            {arr.map((x, i) => {
              const isSel = sel === i;
              const isHint = hint?.includes(i);
              return (
                <motion.button key={x} layout transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  draggable={replay === null} onDragStart={() => (dragFrom.current = i)} onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragFrom.current !== null && dragFrom.current !== i) swap(dragFrom.current, i); dragFrom.current = null; }}
                  onClick={() => replay === null && click(i)} disabled={replay !== null || !!g.finished}
                  aria-label={`Block ${x}${isSel ? ", selected" : ""}`} aria-pressed={isSel}
                  whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }}
                  className={`relative flex-1 max-w-[64px] rounded-t-2xl rounded-b-lg grid place-items-start justify-center pt-2 font-display font-extrabold text-white shadow-clay
                    ${isSel ? "ring-4 ring-primary ring-offset-2 ring-offset-surface" : ""} ${isHint ? "ring-4 ring-warn ring-offset-2 ring-offset-surface animate-pulse" : ""}`}
                  style={{ height: `${18 + (x / max) * 82}%`, background: `hsl(${220 - (x / max) * 180} 50% 52%)` }}>
                  {x}
                </motion.button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted text-center">{sel !== null ? "Now pick the block to swap with." : "Tap a block to select it."}</p>
        </div>
      )}
    </>
  );
}
