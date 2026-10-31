import { z } from "zod";
import { body, rateLimit, route } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
import { award } from "@/lib/logic";

const MINUTES = 10;

export const GET = route(async () => {
  const u = requireUser("student", "teacher");
  const d = db();
  const exams = (d.exams ?? []).filter((e) => u.role === "teacher" || e.userId === u.id).slice(-40).reverse();
  return {
    exams: exams.map((e) => ({ ...e, student: d.users.find((x) => x.id === e.userId)?.name, total: e.qids.length })),
  };
});

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("event"), examId: z.string(), kind: z.enum(["visibility", "blur", "copy", "paste", "contextmenu"]) }),
  z.object({ action: z.literal("submit"), examId: z.string(), answers: z.array(z.number().int().nullable()).max(20) }),
]);

export const POST = route(async (req: Request) => {
  const u = requireUser("student");
  const p = await body(req, Schema);
  return tx((d) => {
    d.exams ??= [];
    if (p.action === "start") {
      rateLimit("exam:" + u.id, 10, 60 * 60_000);
      const qids = [...d.questions].sort(() => Math.random() - 0.5).slice(0, 6).map((q) => q.id);
      const now = Date.now();
      const e = { id: uid("x"), userId: u.id, qids, startedAt: new Date(now).toISOString(), endsAt: new Date(now + MINUTES * 60_000).toISOString(), events: [] };
      d.exams.push(e);
      return { examId: e.id, endsAt: e.endsAt, questions: qids.map((id) => { const q = d.questions.find((x) => x.id === id)!; return { id, q: q.q, options: q.options, topic: q.topic }; }) };
    }
    const e = d.exams.find((x) => x.id === p.examId && x.userId === u.id);
    if (!e) throw new HttpError(404, "Exam not found.");
    if (p.action === "event") {
      // signals are only recorded inside the exam window
      if (!e.submittedAt && Date.now() <= new Date(e.endsAt).getTime() + 30_000 && e.events.length < 300) e.events.push({ at: new Date().toISOString(), kind: p.kind });
      return { ok: true };
    }
    if (e.submittedAt) return { score: e.score, total: e.qids.length, duplicate: true };
    const answers = e.qids.map((_, i) => p.answers[i] ?? null);
    const review = e.qids.map((id, i) => { const q = d.questions.find((x) => x.id === id)!; return { q: q.q, options: q.options, answer: q.answer, chosen: answers[i], explanation: q.explanation }; });
    const score = review.filter((r) => r.chosen === r.answer).length;
    Object.assign(e, { submittedAt: new Date().toISOString(), answers, score });
    award(d, u.id, `exam:${e.id}`, score * 5, `Mock exam ${score}/${e.qids.length}`);
    return { score, total: e.qids.length, review };
  });
});

export const dynamic = "force-dynamic";
