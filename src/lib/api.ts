import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { HttpError } from "./auth";

/** Wraps a route handler: JSON errors, Zod errors, and a same-origin check on writes (CSRF). */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<unknown> | unknown) {
  return async (...args: A) => {
    try {
      const req = args[0] as Request;
      if (req && req.method !== "GET") {
        const origin = headers().get("origin");
        const host = headers().get("host");
        if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Cross-site request blocked.");
      }
      const out = await fn(...args);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong on our side." }, { status: 500 });
    }
  };
}

export async function body<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
  return schema.parse(raw);
}

const buckets = new Map<string, number[]>();
/** Sliding-window rate limit per key. */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) throw new HttpError(429, "Slow down a little and try again shortly.");
  hits.push(now);
  buckets.set(key, hits);
}
