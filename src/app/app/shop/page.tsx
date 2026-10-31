"use client";
import { motion } from "framer-motion";
import { Check, Coins, Globe, Lamp, Leaf, Image as ImageIcon, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { ErrorState, PageHeader, PageSkeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client";

const ICON: Record<string, import("lucide-react").LucideIcon> = { plant: Leaf, trophy: Trophy, poster: ImageIcon, lamp: Lamp, globe: Globe, "frame-aurora": Sparkles };

export default function Shop() {
  const { data, error, loading, reload } = useApi<{ items: { id: string; name: string; price: number; desc: string; kind: string; owned: boolean }[]; coins: number }>("/api/shop");
  const { toast, refreshMe, sfx, confetti, me } = useApp();
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const buy = async (id: string, name: string) => {
    try { await api("/api/shop", { body: { itemId: id } }); sfx("coin"); confetti(); toast(`${name} is now on your 3D desk!`); reload(); refreshMe(); }
    catch (e) { sfx("bad"); toast((e as Error).message, "err"); }
  };
  const student = me?.user?.role === "student";
  return (
    <>
      <PageHeader title="Coin Shop" desc="Cosmetic items for your 3D desk and avatar. Coins never affect grades." action={<span className="chip bg-warn/15 text-warn !text-base !px-4 !py-2"><Coins size={18} aria-hidden /> {data.coins} coins</span>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.items.map((it, i) => {
          const Icon = ICON[it.id] ?? Sparkles;
          const afford = data.coins >= it.price;
          return (
            <motion.div key={it.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card card-hover p-5 flex flex-col">
              <motion.div whileHover={{ rotate: [0, -8, 8, 0], scale: 1.05 }} className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary shadow-clay"><Icon size={40} aria-hidden /></motion.div>
              <h2 className="font-bold text-center">{it.name}</h2>
              <p className="text-sm text-muted text-center flex-1 mt-1">{it.desc}</p>
              {it.owned ? <Link href="/app/classroom" className="btn-soft mt-4"><Check size={16} aria-hidden /> Owned · see it in 3D</Link> : (
                <button className="btn-primary mt-4" disabled={!afford || !student} onClick={() => buy(it.id, it.name)}><Coins size={16} aria-hidden /> {it.price} coins</button>
              )}
              {!it.owned && !afford && student && <p className="text-xs text-muted text-center mt-2">{it.price - data.coins} more coins needed</p>}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
