import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
import { audit, notify, students } from "@/lib/logic";

export const GET = route(async () => {
  requireUser();
  return { meetings: db().meetings.slice().sort((a, b) => a.at.localeCompare(b.at)) };
});

const Schema = z.object({
  title: z.string().trim().min(3).max(140),
  kind: z.enum(["live-class", "faculty", "consultation", "parent-teacher"]),
  at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Pick a valid date and time."),
  minutes: z.number().int().min(10).max(240),
});

export const POST = route(async (req: Request) => {
  const u = requireUser("teacher");
  const input = await body(req, Schema);
  return tx((d) => {
    const m = { ...input, at: new Date(input.at).toISOString(), id: uid("m"), room: "ClassPulse-" + uid().replace(/[^a-zA-Z0-9]/g, ""), createdBy: u.id };
    d.meetings.push(m);
    if (m.kind === "live-class") students(d).forEach((s) => notify(d, s.id, `Live class scheduled: ${m.title}`, "/app/meetings"));
    audit(d, u.id, `scheduled meeting ${m.title}`);
    return { id: m.id };
  });
});

export const dynamic = "force-dynamic";
