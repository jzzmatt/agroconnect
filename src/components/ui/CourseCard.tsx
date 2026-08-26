import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { LocationBadge } from "@/components/location";
import { PlayCircle } from "lucide-react";
import { Button } from "./Button";
import Link from "next/link";

export interface CourseCardProps {
  id: string;
  slug: string;
  title: string;
  instructorName: string;
  instructorRole?: string;
  provinceName?: string;
  durationHours: number;
  lessonsCount: number;
  studentsCount?: number;
  priceFormatted?: string;
  level?: "Iniciante" | "Intermédio" | "Avançado";
  category?: string;
  thumbnailUrl?: string;
  enrolled?: boolean;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}

export function CourseCard({
  id,
  slug,
  title,
  instructorName,
  instructorRole = "Instrutor Especialista",
  provinceName = "Huambo",
  durationHours = 12,
  lessonsCount = 18,
  studentsCount = 142,
  priceFormatted = "35.000 Kz",
  level = "Intermédio",
  category = "Agronomia Prática",
  thumbnailUrl,
  enrolled = false,
  ctaLabel,
  ctaHref,
  className,
}: CourseCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card rounded-3xl border border-border overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group",
        className
      )}
    >
      <div>
        {/* Banner Header */}
        <div className="relative h-40 w-full bg-linear-to-br from-emerald-800 to-emerald-950 p-4 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <Badge variant="pillarAcademy" className="bg-white/95 dark:bg-slate-900 text-blue-900 dark:text-blue-200">
              AgriAcademy
            </Badge>
            <span className="text-[11px] font-bold text-white bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full">
              {level}
            </span>
          </div>

          <div className="z-10 flex items-center gap-2 text-emerald-100 text-xs">
            <PlayCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{category}</span>
          </div>

          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{instructorName}</span>
            <span className="text-[11px]">{instructorRole}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 border-y border-border text-center text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">Duração</span>
              <span className="font-bold text-foreground">{durationHours}h</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Aulas</span>
              <span className="font-bold text-foreground">{lessonsCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Alunos</span>
              <span className="font-bold text-foreground">{studentsCount}</span>
            </div>
          </div>

          {provinceName && (
            <LocationBadge provinceName={provinceName} size="sm" />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground block">Inscrição</span>
          <span className="text-base font-extrabold text-foreground">{priceFormatted}</span>
        </div>

        <Link href={ctaHref}>
          <Button variant="primary" size="sm" className="font-bold">
            {ctaLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
