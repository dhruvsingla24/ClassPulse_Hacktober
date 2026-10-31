import { z } from "zod";
import { body, route } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
import { audit, notify } from "@/lib/logic";
import { StrokesSchema } from "@/lib/schemas";
import type { DB, User } from "@/lib/types";

type Ctx = { params: { id: string } };

function load(d: DB, u: User, id: string) {
  const x = d.doubts.find((y) => y.id === id);
  if (!x) throw new HttpError(404, "Doubt not found.");
  if (u.role !== "teacher" && x.studentId !== u.id) throw new HttpError(403, "This doubt belongs to someone else.");
  return x;
}

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const u = requireUser("student", "teacher");
  const d = db();
  const x = load(d, u, params.id);
  const name = (id: string) => d.users.find((s) => s.id === id);
  return {
    doubt: {
      ...x,
      subject: d.subjects.find((s) => s.id === x.subjectId)?.name,
      student: name(x.studentId)?.name,
      replies: x.replies.map((r) => ({ ...r, author: name(r.authorId)?.name, role: name(r.authorId)?.role })),
      helpedCount: x.helped.length,
      helpedByMe: x.helped.includes(u.id),
    },
    me: u.role,
  };
});

const Patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), text: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal("status"), status: z.enum(["pending", "reviewing", "answered", "next-class", "resolved"]) }),
  z.object({ action: z.literal("annotate"), annotation: StrokesSchema }),
  z.object({ action: z.literal("helped") }),
  z.object({ action: z.literal("faq"), q: z.string().trim().min(5).max(200), a: z.string().trim().min(5).max(2000) }),
]);

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const u = requireUser("student", "teacher");
  const p = await body(req, Patch);
  return tx((d) => {
    const x = load(d, u, params.id);
    const teacher = u.role === "teacher";
    switch (p.action) {
      case "reply":
        x.replies.push({ id: uid("r"), authorId: u.id, text: p.text, at: new Date().toISOString() });
        if (teacher && (x.status === "pending" || x.status === "reviewing")) x.status = "answered";
        if (teacher) notify(d, x.studentId, `Your teacher replied: ${x.title}`, `/app/doubts/${x.id}`);
        else d.users.filter((t) => t.role === "teacher").forEach((t) => notify(d, t.id, `Follow-up on: ${x.title}`, `/app/doubts/${x.id}`));
        break;
      case "status":
        if (!teacher && p.status !== "resolved") throw new HttpError(403, "Only your teacher can change this status.");
        x.status = p.status;
        if (p.status === "resolved") x.resolvedAt = new Date().toISOString();
        if (teacher) notify(d, x.studentId, `Doubt marked ${p.status.replace("-", " ")}: ${x.title}`, `/app/doubts/${x.id}`);
        break;
      case "annotate":
        if (!teacher) throw new HttpError(403, "Only teachers annotate doubts.");
        x.annotation = p.annotation;
        if (x.status === "pending") x.status = "reviewing";
        notify(d, x.studentId, `Your teacher annotated your drawing: ${x.title}`, `/app/doubts/${x.id}`);
        break;
      case "helped":
        x.helped = x.helped.includes(u.id) ? x.helped.filter((h) => h !== u.id) : [...x.helped, u.id];
        break;
      case "faq":
        if (!teacher) throw new HttpError(403, "Only teachers publish to the FAQ.");
        d.faq.push({ id: uid("f"), subjectId: x.subjectId, topic: x.topic, q: p.q, a: p.a, helpful: 0, fromDoubt: x.id });
        x.inFaq = true;
        audit(d, u.id, `published doubt ${x.id} to FAQ`);
        break;
    }
    return { ok: true };
  });
});

export const dynamic = "force-dynamic";
