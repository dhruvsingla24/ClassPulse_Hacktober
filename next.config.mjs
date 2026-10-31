import { randomBytes } from "node:crypto";

// On Vercel every server instance needs the same session key, or a sign-in made on one instance is
// rejected by the next. If CLASSPULSE_SECRET isn't set, generate one random key per build and bake it
// into the server code (it is only read in src/lib/auth.ts, so it never reaches the browser).
const buildSecret = process.env.VERCEL && !process.env.CLASSPULSE_SECRET ? randomBytes(32).toString("hex") : "";

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["three"],
  env: { CLASSPULSE_BUILD_SECRET: buildSecret },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
export default nextConfig;
