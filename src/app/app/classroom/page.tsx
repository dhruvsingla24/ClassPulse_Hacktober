"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

const Scene = dynamic(() => import("@/components/three/room"), { ssr: false, loading: () => <Skeleton className="h-[70vh]" /> });

export default function Classroom() {
  return <Scene />;
}
