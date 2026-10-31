"use client";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DOORS } from "./three/corridor";

const Campus = dynamic(() => import("./three/campus"), { ssr: false, loading: () => <div className="fixed inset-0 bg-[#131720]" /> });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Illustrated 2D entrance with the same navigation, for devices without WebGL. */
function Fallback() {
  return (
    <main className="min-h-dvh bg-mesh flex flex-col items-center justify-center p-6 text-center">
      <svg viewBox="0 0 400 220" className="w-full max-w-xl" role="img" aria-label="Illustration of ClassPulse Academy">
        <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f5c79a" /><stop offset="1" stopColor="#f4f3ee" /></linearGradient></defs>
        <rect width="400" height="220" rx="24" fill="url(#sky)" />
        <circle cx="320" cy="60" r="26" fill="#ffd27a" opacity="0.9" />
        <rect x="70" y="80" width="260" height="120" fill="#e9e4da" />
        <rect x="70" y="72" width="260" height="10" fill="#4a66c4" />
        <rect x="140" y="94" width="120" height="20" rx="4" fill="#1e2638" />
        <text x="200" y="108" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffd27a">CLASSPULSE ACADEMY</text>
        <rect x="182" y="140" width="36" height="60" fill="#bfe0ff" stroke="#3b4a6b" strokeWidth="2" />
        {[90, 120, 270, 300].map((x) => <rect key={x} x={x} y="130" width="18" height="20" fill="#ffe2a8" />)}
        <ellipse cx="40" cy="190" rx="26" ry="34" fill="#5c8f55" /><ellipse cx="360" cy="190" rx="26" ry="34" fill="#6f9e5b" />
      </svg>
      <h1 className="mt-8 text-3xl md:text-4xl font-extrabold">Welcome to ClassPulse: Your Classroom, Reimagined.</h1>
      <p className="mt-2 text-muted">Your device can't show the 3D campus, so here's the same school in 2D.</p>
      <nav className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl" aria-label="Rooms">
        {DOORS.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={d.id === "teacher" || d.id === "student" ? "/login" : d.route} className="card card-hover p-4 flex flex-col items-start gap-1 text-left">
              <span className="h-2 w-10 rounded-full" style={{ background: d.color }} aria-hidden />
              <span className="font-bold">{d.label.charAt(0) + d.label.slice(1).toLowerCase()}</span>
              <span className="text-sm text-muted">{d.sub}</span>
            </Link>
          </motion.div>
        ))}
      </nav>
    </main>
  );
}

export function Entrance() {
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => setGl(hasWebGL()), []);
  if (gl === null) return <div className="fixed inset-0 bg-[#131720]" />;
  return gl ? <Campus /> : <Fallback />;
}
