"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Sprout,
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  Menu,
  X,
  ChevronRight,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { useI18n } from "@/i18n/provider";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { dict } = useI18n();
  const { isSignedIn } = useUser();
  const { handleSignOut, pending: signingOut } = useSignOut();

  const navLinks = [
    { href: "/", label: dict.navigation.home },
    { href: "/services", label: dict.navigation.services, icon: Users, badge: dict.navigation.servicesBadge },
    { href: "/agriexpert", label: dict.navigation.agriExpert, icon: Users, badge: dict.navigation.expertsBadge },
    { href: "/agriacademy", label: dict.navigation.agriAcademy, icon: GraduationCap, badge: dict.navigation.coursesBadge },
    { href: "/agrishopping", label: dict.navigation.agriShopping, icon: ShoppingBag, badge: dict.navigation.productsBadge },
    { href: "/agrilocalizacao", label: dict.navigation.agriLocalizacao, icon: MapPin },
    { href: "/about", label: dict.navigation.aboutUs },
    { href: "/pricing", label: dict.navigation.pricing },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-surface-elevated/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16 sm:h-18 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0 flex-1 lg:flex-none">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md group-hover:bg-primary-hover transition-colors shrink-0">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-200" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-xl font-black tracking-tight text-foreground font-sans truncate">
                {dict.common.brandName}
              </span>
              <span className="hidden sm:block text-[10px] font-bold text-primary tracking-wider uppercase truncate">
                {dict.navigation.brandSubtitle}
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors flex items-center gap-1.5",
                    isActive
                      ? "bg-secondary text-secondary-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5 text-primary" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <LanguageSelector compact />
            <ThemeSwitcher />

            <Link href="/cart" className="p-2 rounded-xl text-foreground hover:bg-muted relative transition-colors" title={dict.navigation.cart}>
              <ShoppingBag className="w-5 h-5 text-primary" />
            </Link>

            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="gap-1.5 font-bold">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>{dict.navigation.dashboard}</span>
                  </Button>
                </Link>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="gap-1.5 font-bold text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{dict.navigation.signOut}</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="outline" size="sm" className="font-bold">
                    {dict.navigation.signIn}
                  </Button>
                </Link>

                <Link href="/sign-up">
                  <Button variant="primary" size="sm" className="font-bold">
                    {dict.navigation.signUp}
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden shrink-0">
            <Link
              href="/cart"
              className="p-2 rounded-xl text-foreground hover:bg-muted relative transition-colors"
              title={dict.navigation.cart}
              aria-label={dict.navigation.cart}
            >
              <ShoppingBag className="w-5 h-5 text-primary" />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-foreground hover:bg-muted focus:outline-none"
              aria-label={dict.navigation.openMenu}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-surface-elevated px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex flex-col items-center gap-3 pb-3 border-b border-border">
            <LanguageSelector compact className="w-full justify-center" />
            <ThemeSwitcher />
          </div>

          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-sm font-semibold flex items-center justify-between",
                    isActive
                      ? "bg-secondary text-secondary-foreground font-bold"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {link.icon && <link.icon className="w-4 h-4 text-primary shrink-0" />}
                    <span className="truncate">{link.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {isSignedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center font-bold">
                    {dict.navigation.dashboard}
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void handleSignOut();
                  }}
                  disabled={signingOut}
                  className="w-full justify-center text-destructive font-bold"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  <span>{dict.navigation.signOut}</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">
                    {dict.navigation.signIn}
                  </Button>
                </Link>
                <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    {dict.navigation.signUp}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
