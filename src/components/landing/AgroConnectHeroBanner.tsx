"use client";

import React, { useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wrench,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Button } from "@/components/ui";
import {
  AGROCONNECT_HERO_IMAGE_HEIGHT,
  AGROCONNECT_HERO_IMAGE_PATH,
  AGROCONNECT_HERO_IMAGE_WIDTH,
} from "@/lib/landing/agroconnect-hero-asset";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { AgroConnectHeroCard } from "./AgroConnectHeroCard";
import { AgroConnectHeroConnections } from "./AgroConnectHeroConnections";

export function AgroConnectHeroBanner() {
  const { dict } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [0, 24]);

  const fadeUp = (delay: number) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: "easeOut" as const },
        };

  const ecosystemCards = useMemo(
    () => [
      {
        id: "expert",
        title: dict.navigation.agriExpert,
        description: dict.landing.previewExpert,
        href: "/agriexpert",
        icon: <Users className="h-4 w-4" />,
        showOnMobile: true,
        floatDuration: 6.2,
        floatDelay: 0,
        entranceDelay: 0.85,
      },
      {
        id: "academy",
        title: dict.navigation.agriAcademy,
        description: dict.landing.previewAcademy,
        href: "/agriacademy",
        icon: <GraduationCap className="h-4 w-4" />,
        showOnMobile: false,
        floatDuration: 6.8,
        floatDelay: 0.6,
        entranceDelay: 0.95,
      },
      {
        id: "shopping",
        title: dict.navigation.agriShopping,
        description: dict.landing.previewShopping,
        href: "/agrishopping",
        icon: <ShoppingBag className="h-4 w-4" />,
        showOnMobile: true,
        floatDuration: 7.1,
        floatDelay: 1.1,
        entranceDelay: 1.05,
      },
      {
        id: "service",
        title: dict.navigation.agriService,
        description: dict.landing.heroCardServiceDesc,
        href: "/agriservice",
        icon: <Wrench className="h-4 w-4" />,
        showOnMobile: false,
        floatDuration: 6.5,
        floatDelay: 0.3,
        entranceDelay: 1.15,
      },
    ],
    [dict]
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="relative isolate w-full min-h-[620px] overflow-x-hidden border-b border-border/60"
    >
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ y: parallaxY }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  scale: [1, 1.03, 1],
                  x: ["0%", "-0.4%", "0%"],
                  y: ["0%", "-0.2%", "0%"],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 20, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <Image
            src={AGROCONNECT_HERO_IMAGE_PATH}
            alt={dict.landing.heroVisualAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_42%] md:object-center"
          />
        </motion.div>

        <div
          className={cn(
            "absolute inset-0",
            "bg-gradient-to-b from-background/55 via-background/40 to-background",
            "dark:from-background/70 dark:via-background/55 dark:to-background"
          )}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_82%)] opacity-75 dark:opacity-90" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-4 pb-24 pt-24 sm:px-6 sm:pb-16 sm:pt-28 md:pb-14 lg:px-8 lg:pb-16 lg:pt-28">
        <div className="mx-auto w-full max-w-3xl shrink-0 text-center">
          <motion.div {...fadeUp(0.15)}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/80 px-4 py-1.5 text-xs font-bold text-foreground shadow-2xs backdrop-blur-md sm:text-sm">
              <span>{dict.landing.heroTag}</span>
            </div>
          </motion.div>

          <motion.h1
            id="hero-heading"
            {...fadeUp(0.28)}
            className="mt-5 text-3xl font-black leading-[1.08] tracking-tight text-foreground drop-shadow-sm sm:text-5xl lg:text-6xl"
          >
            {dict.landing.heroTitle}
          </motion.h1>

          <motion.p
            {...fadeUp(0.4)}
            className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-lg lg:text-xl"
          >
            {dict.landing.heroSubtitle}
          </motion.p>

          <motion.div
            {...fadeUp(0.52)}
            className="mt-7 flex flex-col items-center justify-center gap-3.5 sm:flex-row"
          >
            <Link href="/sign-up" className="w-full sm:w-auto">
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  className="h-12 w-full gap-2 px-8 text-sm font-black shadow-lg sm:w-auto"
                >
                  <span>{dict.landing.ctaPrimary}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </Link>

            <Link href="#planos" className="w-full sm:w-auto">
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 w-full gap-2 border-border/80 bg-surface/80 px-8 text-sm font-bold shadow-2xs backdrop-blur-md sm:w-auto"
                >
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>{dict.landing.ctaSecondary}</span>
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div
            {...fadeUp(0.64)}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-foreground">{dict.landing.trustCertified}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-foreground">{dict.landing.trustProvinces}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-foreground">{dict.landing.trustCommerce}</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          {...fadeUp(0.72)}
          className="relative mx-auto mt-8 w-full max-w-5xl md:mt-10 lg:mt-12"
        >
          <AgroConnectHeroConnections className="pointer-events-none absolute inset-4 hidden opacity-60 lg:block" />
          <div className="relative grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-4">
            {ecosystemCards.map((card) => (
              <AgroConnectHeroCard
                key={card.id}
                title={card.title}
                description={card.description}
                href={card.href}
                icon={card.icon}
                floatDuration={card.floatDuration}
                floatDelay={card.floatDelay}
                entranceDelay={card.entranceDelay}
                className={cn(!card.showOnMobile && "hidden md:block")}
              />
            ))}
          </div>
        </motion.div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background md:h-24"
      />
      <span className="sr-only">
        {dict.landing.heroVisualAlt} ({AGROCONNECT_HERO_IMAGE_WIDTH}×{AGROCONNECT_HERO_IMAGE_HEIGHT})
      </span>
    </section>
  );
}
