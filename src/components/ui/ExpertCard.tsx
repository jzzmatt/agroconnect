import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { LocationBadge } from "@/components/location";
import { Star, ShieldCheck, Calendar, Briefcase, Award } from "lucide-react";
import { Button } from "./Button";
import Link from "next/link";

export interface ExpertCardProps {
  id: string;
  name: string;
  title: string;
  specialty: string;
  provinceName: string;
  municipalityName?: string;
  rating?: number;
  consultationsCount?: number;
  avatarUrl?: string | null;
  verified?: boolean;
  hourlyRate?: string;
  profileSlug?: string;
  className?: string;
}

export function ExpertCard({
  id,
  name,
  title,
  specialty,
  provinceName,
  municipalityName,
  rating = 4.9,
  consultationsCount = 28,
  avatarUrl,
  verified = true,
  hourlyRate = "25.000 Kz / hora",
  profileSlug,
  className,
}: ExpertCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card rounded-3xl border border-border p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-primary/40 relative overflow-hidden",
        className
      )}
    >
      {/* Decorative subtle background gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />

      <div>
        {/* Top Header: Avatar, Name/Title, and Pillar Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <Avatar
                src={avatarUrl}
                fallbackText={name}
                size="lg"
                className="ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all shadow-xs"
              />
              {verified && (
                <span
                  title="Especialista Verificado"
                  className="absolute -bottom-1 -right-1 bg-surface-card rounded-full p-0.5 shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
                {name}
              </h3>
              <p className="text-xs font-semibold text-primary/90 dark:text-primary mt-0.5 line-clamp-2">
                {title}
              </p>
            </div>
          </div>

          <Badge variant="pillarExpert" className="text-[10px] font-bold shrink-0">
            AgriService
          </Badge>
        </div>

        {/* Specialty Box */}
        <div className="mt-4 p-3 rounded-2xl bg-surface border border-border/70 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <Award className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Especialidade</span>
          </div>
          <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed">
            {specialty}
          </p>
        </div>

        {/* Location & Rating row */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <LocationBadge provinceName={provinceName} municipalityName={municipalityName} size="sm" />

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/80 shadow-2xs">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              ({consultationsCount})
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Price & Consultation Action */}
      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
            Consultoria
          </span>
          <span className="text-sm font-black text-foreground truncate block">
            {hourlyRate}
          </span>
        </div>

        <Link href={`/providers/${profileSlug || id}`} className="shrink-0">
          <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-9 px-3.5 shadow-xs hover:shadow-md transition-shadow">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ver perfil</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
