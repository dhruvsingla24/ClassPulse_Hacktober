import { route } from "@/lib/api";
import { currentUser, publicUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { coins, earned, level, streak } from "@/lib/logic";
import { DEFAULT_PREFS } from "@/lib/types";

export const GET = route(async () => {
  const u = currentUser();
  if (!u) return { user: null };
  const d = db();
  return {
    user: publicUser(u),
    coins: coins(u.id),
    xp: earned(u.id) * 2,
    level: level(earned(u.id) * 2),
    streak: streak(u.id),
    prefs: d.prefs[u.id] ?? DEFAULT_PREFS,
    unread: d.notifications.filter((n) => n.userId === u.id && !n.read).length,
    inventory: d.inventory.filter((i) => i.userId === u.id).map((i) => i.itemId),
  };
});

export const dynamic = "force-dynamic";
