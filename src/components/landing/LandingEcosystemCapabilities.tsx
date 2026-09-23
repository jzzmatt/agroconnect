"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  Leaf,
  MapPin,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { SectionHeader } from "@/components/ui";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type CapabilityId = "shopping" | "localization" | "academy" | "logistics";

const capabilityLinks: Record<CapabilityId, string> = {
  shopping: "/agrishopping",
  localization: "/agrilocalizacao",
  academy: "/agriacademy",
  logistics: "/services",
};

function EcosystemConnections({
  activeId,
  className,
}: {
  activeId: CapabilityId | null;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const paths: { id: CapabilityId; d: string }[] = [
    { id: "academy", d: "M 50 18 L 50 38" },
    { id: "shopping", d: "M 18 50 L 38 50" },
    { id: "logistics", d: "M 82 50 L 62 50" },
    { id: "localization", d: "M 50 82 L 50 62" },
  ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-primary/20 dark:text-primary/30",
        className
      )}
    >
      {paths.map(({ id, d }, index) => {
        const highlighted = activeId === id;
        return (
          <motion.path
            key={id}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={highlighted ? 0.55 : 0.35}
            strokeLinecap="round"
            className={cn(highlighted && "text-primary/50")}
            initial={{ pathLength: shouldReduceMotion ? 1 : 0, opacity: shouldReduceMotion ? 0.35 : 0 }}
            whileInView={{ pathLength: 1, opacity: highlighted ? 0.55 : 0.3 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 1.1, delay: 0.35 + index * 0.12, ease: "easeInOut" }
            }
          />
        );
      })}
      <circle cx="50" cy="50" r="1.4" className="fill-primary/35" />
    </svg>
  );
}

function CapabilityCard({
  id,
  title,
  description,
  icon,
  preview,
  delay,
  activeId,
  onHover,
}: {
  id: CapabilityId;
  title: string;
  description: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
  delay: number;
  activeId: CapabilityId | null;
  onHover: (id: CapabilityId | null) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const href = capabilityLinks[id];
  const isActive = activeId === id;

  return (
    <motion.div
      className="relative z-10 w-full max-w-sm mx-auto lg:max-w-none"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.55, delay }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
    >
      <Link
        href={href}
        className={cn(
          "group block rounded-3xl border bg-surface-card p-5 shadow-xs transition-all duration-300",
          "hover:border-primary/40 hover:shadow-md",
          isActive && "border-primary/45 shadow-md ring-1 ring-primary/15"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-black text-foreground">{title}</h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-border/80 bg-surface/60 p-3">{preview}</div>
      </Link>
    </motion.div>
  );
}

export function LandingEcosystemCapabilities() {
  const { dict } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<CapabilityId | null>(null);

  const hubMotion = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.92 },
        whileInView: { opacity: 1, scale: 1 },
        transition: { duration: 0.6, ease: "easeOut" as const },
      };

  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/30 via-background to-background py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.05]">
        <Image
          src="/images/agroconnect-ecosystem-capabilities.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority={false}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badgeText={dict.landing.ecosystemBadge}
          title={dict.landing.ecosystemTitle}
          subtitle={dict.landing.ecosystemSubtitle}
          align="center"
        />

        <div className="relative mx-auto mt-12 max-w-5xl">
          <div className="hidden lg:block absolute inset-0 min-h-[520px]">
            <EcosystemConnections activeId={activeId} className="opacity-80" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto] lg:gap-8">
            <div className="lg:col-start-2 lg:row-start-1">
              <CapabilityCard
                id="academy"
                title={dict.landing.ecosystemAcademyTitle}
                description={dict.landing.ecosystemAcademyDesc}
                icon={<GraduationCap className="h-5 w-5" aria-hidden />}
                delay={0.1}
                activeId={activeId}
                onHover={setActiveId}
                preview={
                  <div className="space-y-2">
                    <div className="aspect-video rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-blue-800 dark:text-blue-200">▶</span>
                    </div>
                    <ul className="space-y-1 text-[10px] text-muted-foreground">
                      <li>{dict.landing.ecosystemMiniLessonSoil}</li>
                      <li>{dict.landing.ecosystemMiniLessonCrop}</li>
                      <li>{dict.landing.ecosystemMiniLessonSustainable}</li>
                    </ul>
                  </div>
                }
              />
            </div>

            <div className="lg:col-start-1 lg:row-start-2">
              <CapabilityCard
                id="shopping"
                title={dict.landing.ecosystemShoppingTitle}
                description={dict.landing.ecosystemShoppingDesc}
                icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
                delay={0.18}
                activeId={activeId}
                onHover={setActiveId}
                preview={
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-card p-2">
                    <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-950/50" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{dict.landing.ecosystemMiniProductTitle}</p>
                      <p className="text-[10px] text-primary font-semibold">{dict.landing.ecosystemMiniProductPrice}</p>
                    </div>
                    <span className="rounded-lg bg-primary px-2 py-1 text-[9px] font-bold text-primary-foreground">
                      {dict.landing.ecosystemMiniProductCta}
                    </span>
                  </div>
                }
              />
            </div>

            <div className="lg:col-start-2 lg:row-start-2 flex flex-col items-center justify-center">
              <motion.div
                {...hubMotion}
                viewport={{ once: true, amount: 0.5 }}
                className="relative z-20 w-full max-w-xs rounded-3xl border border-primary/30 bg-surface-card/95 p-6 text-center shadow-lg backdrop-blur-sm"
              >
                <div className="mx-auto mb-3 flex items-center justify-center gap-2">
                  <Leaf className="h-6 w-6 text-primary" aria-hidden />
                  <span className="text-lg font-black tracking-tight text-foreground">AgroConnect</span>
                  <Leaf className="h-6 w-6 scale-x-[-1] text-primary" aria-hidden />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {dict.landing.ecosystemHubTagline}
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {dict.landing.ecosystemHubStatement}
                </p>
              </motion.div>
              <p className="mt-4 text-center text-[11px] font-semibold text-muted-foreground lg:hidden">
                {dict.landing.ecosystemOpportunitiesLabel}
              </p>
            </div>

            <div className="lg:col-start-3 lg:row-start-2">
              <CapabilityCard
                id="logistics"
                title={dict.landing.ecosystemLogisticsTitle}
                description={dict.landing.ecosystemLogisticsDesc}
                icon={<Truck className="h-5 w-5" aria-hidden />}
                delay={0.26}
                activeId={activeId}
                onHover={setActiveId}
                preview={
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3">
                    <Truck className="h-8 w-8 text-teal-600 shrink-0" aria-hidden />
                    <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-teal-500/40 via-primary/30 to-transparent" />
                  </div>
                }
              />
            </div>

            <div className="lg:col-start-2 lg:row-start-3">
              <CapabilityCard
                id="localization"
                title={dict.landing.ecosystemLocalizationTitle}
                description={dict.landing.ecosystemLocalizationDesc}
                icon={<MapPin className="h-5 w-5" aria-hidden />}
                delay={0.34}
                activeId={activeId}
                onHover={setActiveId}
                preview={
                  <div className="relative h-20 overflow-hidden rounded-xl border border-border bg-emerald-50/80 dark:bg-emerald-950/30">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_40%,#0E6B38_0%,transparent_55%),radial-gradient(circle_at_70%_60%,#1D4ED8_0%,transparent_50%)]" />
                    <div className="absolute bottom-2 left-2 right-2 rounded-lg border border-border bg-surface-card/95 p-2 shadow-sm">
                      <p className="text-[10px] font-bold">{dict.landing.ecosystemMiniLocalSupplier}</p>
                      <p className="text-[9px] text-muted-foreground">Benguela</p>
                    </div>
                    <MapPin className="absolute left-1/2 top-1/3 h-5 w-5 -translate-x-1/2 text-primary" aria-hidden />
                  </div>
                }
              />
            </div>
          </div>

          <p className="mt-8 hidden text-center text-xs font-semibold text-muted-foreground lg:block">
            {dict.landing.ecosystemOpportunitiesLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
