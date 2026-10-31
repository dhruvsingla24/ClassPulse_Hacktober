"use client";
import { motion } from "framer-motion";
import { Award, Brain, Code2, Coins, Crown, Gamepad2, Lock, Puzzle, Sigma, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { Card, CardTitle, ErrorState, Grid, PageHeader, PageSkeleton } from "@/components/ui";
import { useApi } from "@/lib/client";

interface Data {
  progress: Record<string, number>;
  plays: number;
  leaderboard: { id: string; name: string; coins: number; me: boolean }[];
  achievements: { key: string; name: string; desc: string; unlocked: boolean }[];
}

const ARENA = [
  { id: "binary-search", name: "Binary Search Treasure Hunt", desc: "Halve the range, find the treasure.", color: "#c98a54" },
  { id: "sorting-race", name: "Sorting Race", desc: "Bubble, selection and insertion sort.", color: "#4a66c4" },
  { id: "linked-list", name: "Linked List Builder", desc: "Insert, delete, traverse, find.", color: "#4fa38a" },
];

const WORLDS = [
  { name: "Math Quest", Icon: Sigma, need: "Clear all 3 Algorithm Arena games", color: "#5b7fd6" },
  { name: "Code Lab", Icon: Code2, need: "Reach level 2 in every Arena game", color: "#4fa38a" },
  { name: "Logic Puzzle Chamber", Icon: Puzzle, need: "Earn the Sorting Master badge", color: "#b46ab8" },
  { name: "AI Explorer", Icon: Brain, need: "Reach level 3 in every Arena game", color: "#c9a54a" },
];

export default function Arcade() {
  const { data, error, loading, reload } = useApi<Data>("/api/arcade");
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const next = ARENA.find((a) => (data.progress[a.id] ?? 0) < 3) ?? ARENA[0];
  return (
    <>
      <PageHeader title="Learning Arcade" desc="Real algorithms, real games. Every move is checked on the server and coins go to a tamper-proof ledger." action={<Link href={`/app/arcade/${next.id}`} className="btn-primary"><Sparkles size={17} aria-hidden /> Continue: {next.name.split(" ")[0]} {next.name.split(" ")[1]}</Link>} />

      <section className="relative card overflow-hidden p-6 md:p-8 mb-5 text-white !border-0" style={{ background: "radial-gradient(80rem 30rem at 20% 0%, #4a3aa8 0%, #1d1940 55%, #12102a 100%)" }} aria-labelledby="arena">
        <div className="absolute inset-0 opacity-40" aria-hidden style={{ backgroundImage: "radial-gradient(#ffffff55 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative flex items-center gap-3 mb-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15"><Gamepad2 aria-hidden /></span>
          <div><h2 id="arena" className="text-xl font-extrabold">World 1 · Algorithm Arena</h2><p className="text-white/70 text-sm">3 games × 3 levels. Clear a level to light up its node.</p></div>
        </div>
        <div className="relative grid md:grid-cols-3 gap-4">
          {ARENA.map((a, i) => {
            const best = data.progress[a.id] ?? 0;
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Link href={`/app/arcade/${a.id}`} className="group block rounded-3xl bg-white/10 hover:bg-white/15 border border-white/15 p-5 transition backdrop-blur">
                  <div className="flex items-center justify-between mb-3">
                    <motion.span whileHover={{ rotate: 10 }} className="grid h-12 w-12 place-items-center rounded-2xl shadow-lg" style={{ background: a.color }}><Trophy aria-hidden /></motion.span>
                    <span className="chip bg-white/15 text-white"><Coins size={13} aria-hidden /> 20–55</span>
                  </div>
                  <h3 className="font-bold text-lg">{a.name}</h3>
                  <p className="text-white/70 text-sm">{a.desc}</p>
                  {/* level path */}
                  <div className="mt-4 flex items-center" aria-label={`Best level cleared: ${best} of 3`}>
                    {[1, 2, 3].map((lv) => (
                      <div key={lv} className="flex items-center flex-1 last:flex-none">
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + lv * 0.1, type: "spring" }}
                          className={`grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold border-2 ${lv <= best ? "bg-[#ffd27a] text-[#3b2a10] border-[#ffd27a] shadow-[0_0_18px_#ffd27a99]" : lv === best + 1 ? "border-white text-white animate-pulse" : "border-white/30 text-white/40"}`}>
                          {lv <= best ? "★" : lv}
                        </motion.span>
                        {lv < 3 && <span className={`h-1 flex-1 mx-1 rounded ${lv < best + 1 ? "bg-[#ffd27a]" : "bg-white/20"}`} aria-hidden />}
                      </div>
                    ))}
                  </div>
                  <span className="mt-4 inline-flex text-sm font-bold text-[#c8d4ff] group-hover:translate-x-1 transition">Play →</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Grid className="md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2">
          <CardTitle icon={Lock}>More worlds</CardTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            {WORLDS.map((w) => (
              <div key={w.name} className="rounded-2xl border border-dashed border-line p-4 flex items-start gap-3 opacity-80" aria-disabled="true">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: w.color }}><w.Icon size={18} aria-hidden /></span>
                <div><h3 className="font-bold flex items-center gap-1.5">{w.name} <Lock size={13} aria-label="Locked" /></h3><p className="text-sm text-muted">Unlocks when you: {w.need}. Levels for this world aren't built yet.</p></div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle icon={Crown}>Weekly leaderboard</CardTitle>
          <ol className="space-y-1.5">
            {data.leaderboard.map((r, i) => (
              <motion.li key={r.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.me ? "bg-primary/10 text-primary font-bold" : ""}`}>
                <span className={`w-6 text-center font-extrabold ${i < 3 ? "text-warn" : "text-muted"}`}>{i + 1}</span>
                <span className="flex-1 truncate">{r.name}{r.me && " (you)"}</span>
                <span className="tabular-nums text-sm flex items-center gap-1"><Coins size={13} aria-hidden />{r.coins}</span>
              </motion.li>
            ))}
          </ol>
        </Card>
        <Card className="md:col-span-2 xl:col-span-3">
          <CardTitle icon={Award}>Achievements</CardTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.achievements.map((a) => (
              <div key={a.key} className={`rounded-2xl p-4 border ${a.unlocked ? "border-warn/50 bg-warn/10" : "border-line opacity-70"}`}>
                <div className="flex items-center gap-2 font-bold">{a.unlocked ? <Award size={18} className="text-warn" aria-hidden /> : <Lock size={16} aria-hidden />}{a.name}</div>
                <p className="text-sm text-muted mt-1">{a.desc}</p>
                <span className="sr-only">{a.unlocked ? "Unlocked" : "Locked"}</span>
              </div>
            ))}
          </div>
        </Card>
      </Grid>
    </>
  );
}
