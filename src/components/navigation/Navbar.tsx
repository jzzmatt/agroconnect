"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sprout,
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { UserProfileButton } from "@/features/auth/components";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { dict } = useI18n();

  const navLinks = [
    { href: "/", label: dict.navigation.home },
    { href: "/agriexpert", label: dict.navigation.agriExpert, icon: Users, badge: "Especialistas" },
    { href: "/agriacademy", label: dict.navigation.agriAcademy, icon: GraduationCap, badge: "Cursos" },
    { href: "/agrishopping", label: dict.navigation.agriShopping, icon: ShoppingBag, badge: "Produtos" },
    { href: "/agrilocalizacao", label: dict.navigation.agriLocalizacao, icon: MapPin },
    { href: "/about", label: dict.navigation.aboutUs },
    { href: "/pricing", label: dict.navigation.pricing },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-emerald-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-md group-hover:bg-emerald-900 transition-colors">
              <Sprout className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-emerald-950 font-sans">
                AGROCONNECT
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 tracking-wider uppercase">
                Angola • Ecossistema Digital
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs xl:text-sm font-semibold transition-colors flex items-center gap-1.5",
                    isActive
                      ? "bg-emerald-50 text-emerald-900 font-bold"
                      : "text-emerald-900/80 hover:text-emerald-950 hover:bg-emerald-50/60"
                  )}
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth / CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-900 font-bold">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>{dict.navigation.dashboard}</span>
              </Button>
            </Link>

            <Link href="/sign-up">
              <Button variant="primary" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                {dict.navigation.signUp}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-bold text-emerald-900">
                {dict.navigation.dashboard}
              </Button>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-emerald-900 hover:bg-emerald-50 focus:outline-none"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-emerald-900/10 bg-white px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-between",
                    isActive
                      ? "bg-emerald-100/70 text-emerald-950 font-bold"
                      : "text-emerald-900 hover:bg-emerald-50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {link.icon && <link.icon className="w-4 h-4 text-emerald-600" />}
                    <span>{link.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-emerald-100 flex flex-col gap-2">
            <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-center">
                {dict.navigation.signIn}
              </Button>
            </Link>
            <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full justify-center bg-emerald-700">
                {dict.navigation.signUp}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
