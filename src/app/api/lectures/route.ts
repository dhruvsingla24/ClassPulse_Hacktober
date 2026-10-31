import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
import { audit, notify, students } from "@/lib/logic";

export const GET = route(async () => {
  const u = requireUser();
  const d = db();
  const done = new Set(d.progress.filter((p) => p.userId === u.id).map((p) => p.lectureId));
  return {
    subjects: d.subjects.map((s) => ({
      ...s,
      lectures: d.lectures
        .filter((l) => l.subjectId === s.id && (l.published || u.role === "teacher"))
        .map((l) => ({ id: l.id, title: l.title, topic: l.topic, kind: l.kind, minutes: l.minutes, published: l.published, done: done.has(l.id) })),
      questions: d.questions.filter((q) => q.subjectId === s.id).length,
    })),
  };
});

const Schema = z.object({
  subjectId: z.string().min(1),
  topic: z.string().trim().min(2).max(60),
  title: z.string().trim().min(4).max(140),
  kind: z.enum(["notes", "video", "link"]),
  url: z.string().url().optional().or(z.literal("")),
  notes: z.string().trim().min(10, "Add some notes (10+ characters).").max(20000),
  minutes: z.number().int().min(1).max(240),
  published: z.boolean(),
});

export const POST = route(async (req: Request) => {
  const u = requireUser("teacher");
  const input = await body(req, Schema);
  return tx((d) => {
    const l = { ...input, url: input.url || undefined, id: uid("l"), createdAt: new Date().toISOString() };
    d.lectures.push(l);
    const subj = d.subjects.find((s) => s.id === l.subjectId);
    if (subj && !subj.topics.includes(l.topic)) subj.topics.push(l.topic);
    if (l.published) students(d).forEach((s) => notify(d, s.id, `New lecture: ${l.title}`, `/app/library/${l.id}`));
    audit(d, u.id, `created lecture ${l.title}`);
    return { id: l.id };
  });
});

export const dynamic = "force-dynamic";
