import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { LocationBadge } from "@/components/location";
import { BookOpen, Clock, Award, Users, PlayCircle } from "lucide-react";
import { Button } from "./Button";
import Link from "next/link";

export interface CourseCardProps {
  id: string;
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
  className?: string;
}

export function CourseCard({
  id,
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
  className,
}: CourseCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-emerald-900/10 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group",
        className
      )}
    >
      <div>
        {/* Banner/Thumbnail Header */}
        <div className="relative h-40 w-full bg-linear-to-br from-emerald-800 to-emerald-950 p-4 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <Badge variant="pillarAcademy" className="bg-white/95 text-blue-900">
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

          {/* Decorative agricultural background pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <h3 className="font-bold text-base text-emerald-950 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>

          <div className="flex items-center justify-between text-xs text-emerald-800/80">
            <span className="font-semibold text-emerald-950">{instructorName}</span>
            <span className="text-[11px] text-muted-foreground">{instructorRole}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 border-y border-emerald-100 text-center text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">Duração</span>
              <span className="font-bold text-emerald-950">{durationHours}h</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Aulas</span>
              <span className="font-bold text-emerald-950">{lessonsCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Alunos</span>
              <span className="font-bold text-emerald-950">{studentsCount}</span>
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
          <span className="text-base font-extrabold text-emerald-950">{priceFormatted}</span>
        </div>

        <Link href={`/agriacademy?course=${id}`}>
          <Button variant="primary" size="sm">
            Ver Curso
          </Button>
        </Link>
      </div>
    </div>
  );
}
