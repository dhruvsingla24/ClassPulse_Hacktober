import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACHIEVEMENTS } from "@/lib/logic";

export const GET = route(async () => {
  const u = requireUser();
  const d = db();
  const mine = d.attempts.filter((a) => a.userId === u.id && a.result?.ok);
  const best = (g: string) => Math.max(0, ...mine.filter((a) => a.game === g).map((a) => a.level));
  const week = Date.now() - 7 * 864e5;
  const totals = new Map<string, number>();
  for (const l of d.ledger) if (l.amount > 0 && new Date(l.at).getTime() > week) totals.set(l.userId, (totals.get(l.userId) ?? 0) + l.amount);
  const leaderboard = [...totals.entries()]
    .map(([id, c]) => ({ id, name: d.users.find((x) => x.id === id)?.name ?? "Student", coins: c, me: id === u.id }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);
  const have = new Set(d.achievements.filter((a) => a.userId === u.id).map((a) => a.key));
  return {
    progress: { "binary-search": best("binary-search"), "sorting-race": best("sorting-race"), "linked-list": best("linked-list") },
    plays: mine.length,
    leaderboard,
    achievements: Object.entries(ACHIEVEMENTS).map(([key, v]) => ({ key, ...v, unlocked: have.has(key) })),
  };
});

export const dynamic = "force-dynamic";
