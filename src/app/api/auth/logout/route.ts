import { cookies } from "next/headers";
import { route } from "@/lib/api";
import { COOKIE } from "@/lib/auth";

export const POST = route(async () => {
  cookies().delete(COOKIE);
  return { ok: true };
});

export const dynamic = "force-dynamic";
