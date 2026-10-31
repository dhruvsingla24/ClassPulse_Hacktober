import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { tx, uid } from "@/lib/db";
import { notify, students } from "@/lib/logic";

export const POST = route(async (req: Request) => {
  const u = requireUser("teacher");
  const { text, pinned } = await body(req, z.object({ text: z.string().trim().min(3).max(500), pinned: z.boolean().default(false) }));
  return tx((d) => {
    d.announcements.unshift({ id: uid("an"), text, pinned, at: new Date().toISOString(), readBy: [u.id] });
    students(d).forEach((s) => notify(d, s.id, `Announcement: ${text.slice(0, 60)}`, "/app"));
    return { ok: true };
  });
});

export const dynamic = "force-dynamic";
