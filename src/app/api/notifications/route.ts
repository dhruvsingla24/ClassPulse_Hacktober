import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db, tx } from "@/lib/db";

export const GET = route(async () => {
  const u = requireUser();
  return { notifications: db().notifications.filter((n) => n.userId === u.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30) };
});

export const POST = route(async () => {
  const u = requireUser();
  tx((d) => d.notifications.forEach((n) => { if (n.userId === u.id) n.read = true; }));
  return { ok: true };
});

export const dynamic = "force-dynamic";
