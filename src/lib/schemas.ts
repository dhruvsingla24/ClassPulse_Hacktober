import { z } from "zod";

export const StrokeSchema = z.object({
  tool: z.enum(["pen", "highlighter", "line", "rect", "arrow", "text"]),
  color: z.string().max(24),
  size: z.number().min(1).max(60),
  points: z.array(z.tuple([z.number(), z.number()])).max(4000),
  text: z.string().max(200).optional(),
});
export const StrokesSchema = z.array(StrokeSchema).max(1500);
