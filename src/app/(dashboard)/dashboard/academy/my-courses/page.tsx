"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function MyCoursesPage() {
  return (
    <div className="bg-surface-card rounded-3xl border border-border p-8 space-y-3">
      <GraduationCap className="w-8 h-8 text-primary" />
      <h1 className="text-2xl font-black">Meus Cursos</h1>
      <p className="text-xs text-muted-foreground">
        Gerir vídeos e quota de armazenamento AgriAcademy.
      </p>
      <Link href="/dashboard/academy" className="text-xs font-bold text-primary hover:underline">
        Abrir armazenamento de vídeos
      </Link>
    </div>
  );
}
