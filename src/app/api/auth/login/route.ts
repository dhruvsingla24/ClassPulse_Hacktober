import { cookies } from "next/headers";
import { z } from "zod";
import { body, rateLimit, route } from "@/lib/api";
import { COOKIE, HttpError, cookieOptions, makeToken, publicUser } from "@/lib/auth";
import { db, tx } from "@/lib/db";
import { audit } from "@/lib/logic";
import { verifyPassword } from "@/lib/password";

const Schema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
  door: z.enum(["teacher", "student"]).optional(),
});

export const POST = route(async (req: Request) => {
  const { email, password, door } = await body(req, Schema);
  rateLimit("login:" + email.toLowerCase(), 8, 60_000);
  const u = db().users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u || !verifyPassword(password, u.salt, u.hash)) throw new HttpError(401, "That email and password don't match.");
  cookies().set(COOKIE, makeToken(u.id), cookieOptions);
  tx((d) => audit(d, u.id, "signed in"));
  // The door is cosmetic. Authorisation always uses the stored role.
  const mismatch = door && door !== (u.role === "teacher" ? "teacher" : "student") && (u.role === "teacher" || u.role === "student");
  return {
    user: publicUser(u),
    note: mismatch ? `You signed in at the ${door === "teacher" ? "Teacher's Lounge" : "Student Classroom"}, so we've taken you to your own ${u.role === "teacher" ? "Teacher's Lounge" : "classroom"}.` : null,
  };
});

export const dynamic = "force-dynamic";
