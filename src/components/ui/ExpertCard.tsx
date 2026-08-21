import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { LocationBadge } from "@/components/location";
import { Star, ShieldCheck, CheckCircle2, Calendar } from "lucide-react";
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
        "bg-white rounded-2xl border border-emerald-900/10 p-5 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group",
        className
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar src={avatarUrl} fallbackText={name} size="lg" />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base text-emerald-950 group-hover:text-emerald-700 transition-colors">
                  {name}
                </h3>
                {verified && (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                )}
              </div>
              <p className="text-xs font-semibold text-emerald-700">{title}</p>
            </div>
          </div>
          <Badge variant="pillarExpert" className="text-[10px]">
            AgriExpert
          </Badge>
        </div>

        <div className="mt-4 space-y-2.5">
          <p className="text-xs text-muted-foreground line-clamp-2">
            Especialidade: <span className="font-medium text-emerald-950">{specialty}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <LocationBadge provinceName={provinceName} municipalityName={municipalityName} size="sm" />
            <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{rating.toFixed(1)}</span>
              <span className="text-[10px] text-amber-800/70 font-normal">({consultationsCount})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-emerald-100/80 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-muted-foreground block">Consultoria</span>
          <span className="text-xs font-bold text-emerald-950">{hourlyRate}</span>
        </div>

        <Link href={`/agriexpert?expert=${profileSlug || id}`}>
          <Button variant="primary" size="sm" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Consultar</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
