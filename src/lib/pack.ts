import { z } from "zod";

/** The Open Classroom Pack format: plain JSON, CC BY 4.0, no personal data. */
export const PackSchema = z.object({
  format: z.literal("classpulse-pack"),
  version: z.literal(1),
  name: z.string().min(2).max(120),
  license: z.string().max(40).default("CC-BY-4.0"),
  author: z.string().max(120).optional(),
  subjects: z.array(z.object({ id: z.string().max(40), name: z.string().max(80), topics: z.array(z.string().max(60)).max(40) })).max(30),
  lectures: z.array(z.object({ subjectId: z.string(), topic: z.string().max(60), title: z.string().max(140), kind: z.enum(["notes", "video", "link"]), url: z.string().url().optional(), notes: z.string().max(20000), minutes: z.number().int().min(1).max(240) })).max(300).default([]),
  questions: z.array(z.object({ subjectId: z.string(), topic: z.string().max(60), difficulty: z.enum(["easy", "medium", "hard"]), q: z.string().max(500), options: z.array(z.string().max(200)).min(2).max(6), answer: z.number().int().min(0), hint: z.string().max(300).default(""), explanation: z.string().max(1000).default("") }).refine((q) => q.answer < q.options.length, "Answer index is out of range.")).max(2000).default([]),
  faq: z.array(z.object({ subjectId: z.string(), topic: z.string().max(60), q: z.string().max(200), a: z.string().max(2000) })).max(500).default([]),
  gameLevels: z.array(z.object({ game: z.string(), level: z.number().int(), description: z.string() })).default([]),
  doubtStats: z.array(z.object({ subjectId: z.string(), topic: z.string(), doubts: z.number().int(), open: z.number().int() })).default([]),
});
export type Pack = z.infer<typeof PackSchema>;
