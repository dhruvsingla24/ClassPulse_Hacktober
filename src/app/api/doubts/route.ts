import { z } from "zod";
import { body, rateLimit, route } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
import { grantAchievement, notify } from "@/lib/logic";
import { StrokesSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const u = requireUser("student", "teacher");
  const d = db();
  const list = d.doubts
    .filter((x) => u.role === "teacher" || x.studentId === u.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((x) => ({
      id: x.id, title: x.title, topic: x.topic, status: x.status, priority: x.priority, createdAt: x.createdAt,
      subject: d.subjects.find((s) => s.id === x.subjectId)?.name, subjectId: x.subjectId,
      student: u.role === "teacher" ? d.users.find((s) => s.id === x.studentId)?.name : undefined,
      replies: x.replies.length, hasDrawing: x.drawing.length > 0, annotated: x.annotation.length > 0,
    }));
  return { doubts: list };
});

const Schema = z.object({
  subjectId: z.string().min(1),
  topic: z.string().min(1).max(60),
  title: z.string().trim().min(6, "Give your doubt a short title (6+ characters).").max(140),
  body: z.string().trim().max(4000).default(""),
  code: z.string().max(4000).optional(),
  priority: z.enum(["normal", "exam-soon"]).default("normal"),
  drawing: StrokesSchema.default([]),
});

export const POST = route(async (req: Request) => {
  const u = requireUser("student");
  const input = await body(req, Schema);
  rateLimit("doubt:" + u.id, 10, 10 * 60_000);
  return tx((d) => {
    if (!d.subjects.some((s) => s.id === input.subjectId)) throw new HttpError(400, "Pick a subject.");
    const doubt = { id: uid("d"), studentId: u.id, ...input, status: "pending" as const, annotation: [], replies: [], helped: [], createdAt: new Date().toISOString() };
    d.doubts.push(doubt);
    d.users.filter((t) => t.role === "teacher").forEach((t) => notify(d, t.id, `New doubt from ${u.name}: ${input.title}`, `/app/doubts/${doubt.id}`));
    grantAchievement(d, u.id, "first-doubt");
    return { id: doubt.id };
  });
});

export const dynamic = "force-dynamic";
