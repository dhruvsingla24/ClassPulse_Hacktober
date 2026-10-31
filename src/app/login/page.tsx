"use client";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { LoginForm } from "@/components/three/login-panel";

export default function LoginPage() {
  const router = useRouter();
  const { refreshMe, toast } = useApp();
  return (
    <main className="min-h-dvh bg-mesh grid place-items-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass rounded-[28px] shadow-lift p-7">
        <Link href="/" className="text-sm text-muted inline-flex items-center gap-1.5 hover:text-ink mb-5"><ArrowLeft size={15} aria-hidden /> Back to the 3D campus</Link>
        <div className="flex items-center gap-3 mb-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-ink shadow-clay"><GraduationCap aria-hidden /></span>
          <div>
            <h1 className="text-2xl font-extrabold">Sign in to ClassPulse</h1>
            <p className="text-sm text-muted">Students, teachers, parents and admins.</p>
          </div>
        </div>
        <LoginForm onSignedIn={async (_role, note) => { await refreshMe(); if (note) toast(note, "info"); router.push("/app"); }} />
      </motion.div>
    </main>
  );
}
