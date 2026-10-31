import { z } from "zod";
import { body, rateLimit, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { tx } from "@/lib/db";
import { publicView, startAttempt } from "@/lib/arcade";

const Schema = z.object({
  game: z.enum(["binary-search", "sorting-race", "linked-list", "daily-challenge"]),
  level: z.number().int().min(1).max(3).default(1),
  mode: z.enum(["bubble", "selection", "insertion"]).optional(),
});

export const POST = route(async (req: Request) => {
  const u = requireUser("student");
  const { game, level, mode } = await body(req, Schema);
  rateLimit("start:" + u.id, 40, 10 * 60_000);
  return tx((d) => {
    const a = startAttempt(d, u.id, game, level, mode);
    return { attemptId: a.id, game, level, view: publicView(a, d) };
  });
});

export const dynamic = "force-dynamic";
