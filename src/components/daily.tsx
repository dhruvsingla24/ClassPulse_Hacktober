"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Coins, HelpCircle, Loader2, Sparkles, XCircle, Zap } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "./providers";
import { CardTitle } from "./ui";

interface Q { id: string; q: string; options: string[]; topic: string; subject: string; hint: string }
interface Result { correct: boolean; answer: number; explanation: string; finished?: { coins: number; note?: string; streak: { current: number }; achievements: string[] } }

export function DailyChallenge({ done, onDone }: { done: boolean; onDone: () => void }) {
  const { refreshMe, toast, sfx, confetti } = useApp();
  const [attempt, setAttempt] = useState<string | null>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [res, setRes] = useState<Record<number, Result & { choice: number }>>({});
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [final, setFinal] = useState<Result["finished"] | null>(null);

  const start = async () => {
    setBusy(true);
    try {
      const r = await api<{ attemptId: string; view: { questions: Q[] } }>("/api/arcade/start", { body: { game: "daily-challenge", level: 1 } });
      setAttempt(r.attemptId); setQs(r.view.questions); setI(0); setRes({}); setFinal(null);
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  };
  const answer = async (choice: number) => {
    if (!attempt || res[i]) return;
    setBusy(true);
    try {
      const r = await api<Result>("/api/arcade/move", { body: { attemptId: attempt, q: i, choice } });
      setRes((x) => ({ ...x, [i]: { ...r, choice } }));
      sfx(r.correct ? "good" : "bad");
      if (r.finished) {
        setFinal(r.finished);
        if (r.finished.coins > 0) { sfx("coin"); confetti(); }
        await refreshMe();
        onDone();
      }
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); setHint(false); }
  };

  const q = qs[i];
  const r = res[i];
  return (
    <div>
      <CardTitle icon={Zap} action={<span className="chip bg-warn/15 text-warn"><Coins size={13} aria-hidden /> up to 40</span>}>Daily challenge</CardTitle>
      {!attempt ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-muted flex-1">{done ? "You've already collected today's reward. Want more practice? Play again for fun." : "Three quick questions from your subjects. Keeps your streak alive and earns coins."}</p>
          <button className="btn-primary shrink-0" onClick={start} disabled={busy}>{busy ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Sparkles size={17} aria-hidden />} {done ? "Practice again" : "Start challenge"}</button>
        </div>
      ) : final ? (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-3">
          <p className="font-display text-2xl font-extrabold">{Object.values(res).filter((x) => x.correct).length}/3 correct</p>
          <p className="mt-1 text-muted">{final.coins > 0 ? <>You earned <b className="text-warn">{final.coins} coins</b>. Streak: <b>{final.streak.current} days</b>.</> : final.note}</p>
          {final.achievements.length > 0 && <p className="mt-2 chip bg-warn/15 text-warn">Unlocked: {final.achievements.join(", ")}</p>}
          <button className="btn-soft mt-4" onClick={() => setAttempt(null)}>Close</button>
        </motion.div>
      ) : q ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            {qs.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${res[k] ? (res[k].correct ? "bg-good" : "bg-bad") : k === i ? "bg-primary" : "bg-ink/10"}`} aria-hidden />)}
          </div>
          <p className="text-xs text-muted font-semibold uppercase tracking-wide">{q.subject} · {q.topic} · Question {i + 1} of 3</p>
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <p className="font-semibold text-lg mt-1 mb-3">{q.q}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((o, k) => {
                  const state = r ? (k === r.answer ? "right" : k === r.choice ? "wrong" : "idle") : "idle";
                  return (
                    <motion.button key={k} whileTap={{ scale: 0.97 }} onClick={() => answer(k)} disabled={!!r || busy}
                      animate={state === "wrong" ? { x: [0, -6, 6, -3, 0] } : undefined}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-left font-medium transition ${state === "right" ? "border-good bg-good/10" : state === "wrong" ? "border-bad bg-bad/10" : "border-line bg-raised hover:border-primary/50"}`}>
                      {state === "right" ? <CheckCircle2 size={17} className="text-good shrink-0" aria-label="Correct answer" /> : state === "wrong" ? <XCircle size={17} className="text-bad shrink-0" aria-label="Your answer, incorrect" /> : <span className="grid h-5 w-5 place-items-center rounded-md bg-ink/5 text-xs font-bold shrink-0">{String.fromCharCode(65 + k)}</span>}
                      {o}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!r && <button className="btn-ghost text-sm" onClick={() => setHint((h) => !h)}><HelpCircle size={15} aria-hidden /> {hint ? "Hide hint" : "Give me a hint"}</button>}
            {hint && !r && <p className="text-sm text-muted">{q.hint}</p>}
            {r && <p className="text-sm flex-1"><b>{r.correct ? "Correct!" : "Not quite."}</b> {r.explanation}</p>}
            {r && i < 2 && <button className="btn-primary text-sm ml-auto" onClick={() => setI(i + 1)}>Next question</button>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
