import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { resetDemo } from "@/lib/db";

export const POST = route(async () => {
  requireUser("teacher", "admin");
  resetDemo();
  return { ok: true };
});

export const dynamic = "force-dynamic";
