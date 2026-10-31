import { redirect } from "next/navigation";
import { currentUser, publicUser } from "@/lib/auth";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const u = currentUser();
  if (!u) redirect("/login");
  return <Shell user={publicUser(u)}>{children}</Shell>;
}
