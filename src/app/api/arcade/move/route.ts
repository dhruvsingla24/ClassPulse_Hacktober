import { z } from "zod";
import { body, rateLimit, route } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { tx } from "@/lib/db";
import { applyMove } from "@/lib/arcade";

const Schema = z.object({
  attemptId: z.string().min(6),
  index: z.number().int().optional(),
  i: z.number().int().optional(),
  j: z.number().int().optional(),
  position: z.number().int().optional(),
  choice: z.number().int().optional(),
  q: z.number().int().optional(),
});

export const POST = route(async (req: Request) => {
  const u = requireUser("student");
  const m = await body(req, Schema);
  rateLimit("move:" + u.id, 300, 60_000);
  return tx((d) => {
    const a = d.attempts.find((x) => x.id === m.attemptId && x.userId === u.id);
    if (!a) throw new HttpError(404, "Game not found. Start a new round.");
    if (a.result) return { ok: false, reason: "This round is finished.", finished: { ...a.result, duplicate: true } };
    if (Date.now() - new Date(a.startedAt).getTime() > 45 * 60_000) throw new HttpError(410, "This round expired. Start a new one.");
    return applyMove(d, a, m);
  });
});

export const dynamic = "force-dynamic";
