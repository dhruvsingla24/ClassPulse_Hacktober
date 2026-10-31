"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Feedback, GameHeader, ResultCard, StatPill, useGame } from "@/components/game-kit";

type Op = { op: "insertHead" | "insertTail" | "delete" | "find"; value: number };
interface View { list: number[]; ops: Op[]; step: number }

const LABEL: Record<Op["op"], (v: number) => string> = {
  insertHead: (v) => `Insert ${v} at the head`,
  insertTail: (v) => `Insert ${v} at the tail`,
  delete: (v) => `Delete the node holding ${v}`,
  find: (v) => `Find the node holding ${v}`,
};

export default function LinkedListBuilder() {
  const [level, setLevel] = useState(1);
  const g = useGame<View>("linked-list");
  const [walk, setWalk] = useState<number>(-1);
  const newRound = (lv = level) => { setWalk(-1); g.start(lv); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { newRound(level); }, [level]);

  const v = g.view;
  const op = v?.ops[v.step];
  const isInsert = op?.op === "insertHead" || op?.op === "insertTail";

  const answer = async (position: number) => {
    if (!v || g.busy || !op) return;
    const before = v.list;
    const r = await g.move<{ list: number[]; step: number; visited: number }>({ position });
    if (!r?.ok) return;
    // animate the traversal from head for find/delete
    if (!isInsert) {
      for (let k = 0; k <= position; k++) { setWalk(k); await new Promise((res) => setTimeout(res, 260)); }
      setWalk(-1);
    }
    g.setView({ ...v, list: r.list, step: r.step });
    g.setFeedback({ ok: true, text: op.op === "find" ? `Found ${op.value} after visiting ${r.visited} node${r.visited > 1 ? "s" : ""}.` : op.op === "delete" ? `Removed ${op.value}. Its previous node now skips over it.` : `Linked ${op.value} in. ${before.length + 1} nodes now.`, key: Date.now() });
  };

  return (
    <>
      <GameHeader title="Linked List Builder" subtitle="Carry out each operation on the list. For inserts, click the gap where the new node goes. For find and delete, click the node. Pointers update live." level={level} setLevel={setLevel} onRestart={() => newRound()} />
      {g.finished ? <ResultCard f={g.finished} onAgain={() => newRound()} onNext={level < 3 ? () => setLevel(level + 1) : undefined} /> : (
        <div className="card p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <StatPill label="Operation" value={v ? `${Math.min(v.step + 1, v.ops.length)}/${v.ops.length}` : "–"} />
            <StatPill label="Length" value={v?.list.length ?? 0} />
          </div>
          {op && (
            <motion.div key={v?.step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-primary/10 text-primary px-5 py-4 mb-3 flex items-center gap-3">
              {isInsert ? <Plus aria-hidden /> : op.op === "delete" ? <Trash2 aria-hidden /> : <Search aria-hidden />}
              <span className="font-display text-xl font-extrabold">{LABEL[op.op](op.value)}</span>
            </motion.div>
          )}
          <Feedback fb={g.feedback} />
          <div className="overflow-x-auto py-6">
            <div className="flex items-center gap-1 w-max mx-auto">
              <span className="chip bg-ink/10 mr-1">head</span>
              <Gap show={isInsert} onClick={() => answer(0)} label="Insert before the first node" />
              <AnimatePresence initial={false}>
                {v?.list.map((x, i) => (
                  <motion.div key={x} layout initial={{ opacity: 0, scale: 0.5, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.4, y: 30 }} transition={{ type: "spring", stiffness: 380, damping: 26 }} className="flex items-center gap-1">
                    <button onClick={() => !isInsert && answer(i)} disabled={isInsert || g.busy} aria-label={`Node ${x}, position ${i + 1}`}
                      className={`flex rounded-2xl overflow-hidden border-2 shadow-clay transition ${walk === i ? "border-warn scale-110" : "border-primary/40"} ${!isInsert ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"}`}>
                      <span className="px-4 py-3 font-display text-xl font-extrabold bg-raised">{x}</span>
                      <span className="px-2 grid place-items-center bg-primary/15 text-primary text-xs font-bold">next</span>
                    </button>
                    <ArrowRight className="text-primary shrink-0" size={20} aria-hidden />
                    <Gap show={isInsert} onClick={() => answer(i + 1)} label={`Insert after node ${x}`} />
                  </motion.div>
                ))}
              </AnimatePresence>
              <span className="chip bg-ink/10 ml-1">null</span>
            </div>
          </div>
          <p className="text-sm text-muted text-center">Head insert is O(1): only the head pointer changes. Tail insert walks the whole list without a tail pointer.</p>
        </div>
      )}
    </>
  );
}

function Gap({ show, onClick, label }: { show: boolean; onClick: () => void; label: string }) {
  if (!show) return null;
  return (
    <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.15 }} onClick={onClick} aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border-2 border-dashed border-accent text-accent hover:bg-accent/10 shrink-0">
      <Plus size={16} aria-hidden />
    </motion.button>
  );
}
