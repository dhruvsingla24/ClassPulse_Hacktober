import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { tx } from "@/lib/db";
import { DEFAULT_PREFS } from "@/lib/types";

const Schema = z.object({
  theme: z.enum(["auto", "light", "dark", "warm", "contrast"]),
  fontScale: z.number().int().min(100).max(150),
  lineHeight: z.number().min(1.4).max(2),
  dyslexic: z.boolean(),
  motion: z.enum(["full", "reduced", "off"]),
  eveningCare: z.boolean(),
  eveningFrom: z.number().int().min(16).max(23),
  eyeRest: z.boolean(),
  sound: z.boolean(),
  quality: z.enum(["low", "medium", "high"]),
}).partial();

export const PUT = route(async (req: Request) => {
  const u = requireUser();
  const patch = await body(req, Schema);
  return tx((d) => {
    d.prefs[u.id] = { ...DEFAULT_PREFS, ...d.prefs[u.id], ...patch };
    return { prefs: d.prefs[u.id] };
  });
});

export const dynamic = "force-dynamic";
