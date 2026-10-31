import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DATA_DIR, db } from "./db";
import type { PublicUser, Role, User } from "./types";

export const COOKIE = "cp_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret(): string {
  if (process.env.CLASSPULSE_SECRET) return process.env.CLASSPULSE_SECRET;
  // shared by every instance of one Vercel deployment (see next.config.mjs)
  if (process.env.CLASSPULSE_BUILD_SECRET) return process.env.CLASSPULSE_BUILD_SECRET;
  const dir = DATA_DIR;
  const f = path.join(dir, "secret.key");
  if (!fs.existsSync(f)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f, randomBytes(32).toString("hex"));
  }
  return fs.readFileSync(f, "utf8");
}

const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

export function makeToken(userId: string) {
  const body = `${userId}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  return `${body}.${sign(body)}`;
}

export function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const body = token.slice(0, i);
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userId, exp] = body.split(".");
  if (Number(exp) < Date.now() / 1000) return null;
  return userId;
}

export const cookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE, secure: process.env.NODE_ENV === "production" };

export function publicUser(u: User): PublicUser {
  const { salt, hash, ...rest } = u;
  return rest;
}

/** The signed-in user, resolved on the server from the cookie. Roles always come from the DB. */
export function currentUser(): User | null {
  const id = readToken(cookies().get(COOKIE)?.value);
  if (!id) return null;
  return db().users.find((u) => u.id === id) ?? null;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function requireUser(...roles: Role[]): User {
  const u = currentUser();
  if (!u) throw new HttpError(401, "Please sign in.");
  if (roles.length && !roles.includes(u.role)) throw new HttpError(403, "You don't have access to this.");
  return u;
}
