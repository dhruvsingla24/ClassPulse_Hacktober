"use client";
import { Download, Eye, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ComfortPanel } from "@/components/comfort";
import { useApp } from "@/components/providers";
import { Card, CardTitle, Grid, PageHeader } from "@/components/ui";
import { api } from "@/lib/client";

export default function Settings() {
  const { me, toast } = useApp();
  const [comfort, setComfort] = useState(false);
  const canReset = me?.user?.role === "teacher" || me?.user?.role === "admin";
  const reset = async () => {
    if (!confirm("Reset all demo data back to the original seed? Every change in this demo will be lost.")) return;
    await api("/api/admin/reset", { method: "POST" });
    toast("Demo data reset.");
    location.href = "/app";
  };
  return (
    <>
      <PageHeader title="Settings & privacy" desc="Comfort, your data, and demo controls." />
      <Grid className="lg:grid-cols-2">
        <Card>
          <CardTitle icon={Eye}>Comfort</CardTitle>
          <p className="text-sm text-muted mb-4">Theme, text size, motion, eye-care reminders and sound. Saved to your account.</p>
          <button className="btn-primary" onClick={() => setComfort(true)}><Eye size={16} aria-hidden /> Open comfort panel</button>
        </Card>
        <Card>
          <CardTitle icon={ShieldCheck}>Your data</CardTitle>
          <p className="text-sm text-muted mb-4">We store only what the classroom needs: your profile, school work, practice history and settings. Download everything we hold about you as JSON.</p>
          <a className="btn-outline" href="/api/export"><Download size={16} aria-hidden /> Download my data</a>
          <p className="text-xs text-muted mt-3">To delete your account, ask your school admin. In this demo, accounts are shared seed data.</p>
        </Card>
        {canReset && (
          <Card>
            <CardTitle icon={RotateCcw}>Demo data</CardTitle>
            <p className="text-sm text-muted mb-4">Put every account, doubt, grade and coin back to the original seed.</p>
            <button className="btn-outline text-bad" onClick={reset}><RotateCcw size={16} aria-hidden /> Reset demo data</button>
          </Card>
        )}
      </Grid>
      <ComfortPanel open={comfort} onClose={() => setComfort(false)} />
    </>
  );
}
