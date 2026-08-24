"use client";

import React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useI18n } from "@/i18n/provider";

export function Footer() {
  const { dict } = useI18n();

  return (
    <footer className="bg-emerald-950 text-emerald-100 border-t border-emerald-900/40 pt-16 pb-24 lg:pb-12 text-center md:text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2 space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md">
                <span className="text-xl">🌿</span>
              </div>
              <span className="text-xl font-black tracking-tight text-white font-sans">
                {dict.common.brandName}
              </span>
            </Link>
            <p className="text-sm text-emerald-200/80 leading-relaxed max-w-md mx-auto md:mx-0">
              {dict.footer.description}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-emerald-300">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>{dict.footer.provincesCovered}</span>
            </div>
          </div>

          <div className="space-y-3 flex flex-col items-center md:items-start">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {dict.footer.ecosystem}
            </h4>
            <ul className="space-y-2.5 text-xs text-emerald-200/80 font-medium">
              <li>
                <Link href="/agriexpert" className="hover:text-white transition-colors">
                  {dict.navigation.agriExpert}
                </Link>
              </li>
              <li>
                <Link href="/agriacademy" className="hover:text-white transition-colors">
                  {dict.navigation.agriAcademy}
                </Link>
              </li>
              <li>
                <Link href="/agrishopping" className="hover:text-white transition-colors">
                  {dict.navigation.agriShopping}
                </Link>
              </li>
              <li>
                <Link href="/agrilocalizacao" className="hover:text-white transition-colors">
                  {dict.navigation.agriLocalizacao}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 flex flex-col items-center md:items-start">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {dict.footer.support}
            </h4>
            <ul className="space-y-2.5 text-xs text-emerald-200/80 font-medium">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  {dict.footer.contact}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  {dict.footer.faq}
                </Link>
              </li>
              <li>
                <Link href="/planos" className="hover:text-white transition-colors">
                  {dict.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400 gap-4 text-center sm:text-left">
          <p>
            © 2026 {dict.common.brandName}. {dict.common.allRightsReserved}
          </p>
          <p className="flex items-center justify-center gap-1 font-semibold text-emerald-300">
            <span>{dict.footer.madeInAngola}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
