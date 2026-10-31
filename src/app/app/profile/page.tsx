"use client";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { StudentReport } from "@/components/report";
import { Avatar, PageHeader, PageSkeleton } from "@/components/ui";

export default function Profile() {
  const { me } = useApp();
  if (!me?.user) return <PageSkeleton />;
  if (me.user.role === "student") return <StudentReport id={me.user.id} self />;
  return (
    <>
      <PageHeader title="Profile" desc="Your account." />
      <div className="card p-6 flex items-center gap-5 max-w-xl">
        <Avatar name={me.user.name} hue={me.user.avatar} size={72} />
        <div className="flex-1">
          <h2 className="text-xl font-extrabold">{me.user.name}</h2>
          <p className="text-muted capitalize">{me.user.role} · {me.user.email}</p>
        </div>
        <Link href="/app/settings" className="btn-outline"><Settings size={16} aria-hidden /> Settings</Link>
      </div>
    </>
  );
}
