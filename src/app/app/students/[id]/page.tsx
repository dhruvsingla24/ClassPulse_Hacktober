"use client";
import { StudentReport } from "@/components/report";

export default function StudentPage({ params }: { params: { id: string } }) {
  return <StudentReport id={params.id} />;
}
