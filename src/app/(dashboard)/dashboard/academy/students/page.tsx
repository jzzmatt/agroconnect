"use client";

import React from "react";
import Link from "next/link";
import { Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";

export default function AcademyStudentsPage() {
  const { dict } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">{dict.navDash.students}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gestão de alunos inscritos nos seus cursos da AgriAcademy.
          </p>
        </div>
        <Link href="/dashboard/academy/my-courses">
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span>{dict.navDash.myCourses}</span>
          </Button>
        </Link>
      </div>

      <div className="bg-surface-card rounded-3xl border border-border p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Nenhum estudante inscrito ainda</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Quando os alunos se inscreverem nos seus cursos da AgriAcademy, eles aparecerão aqui com o progresso de conclusão.
        </p>
      </div>
    </div>
  );
}
