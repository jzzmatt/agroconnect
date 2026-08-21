"use client";

import React from "react";
import Link from "next/link";
import { Sprout, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/provider";

export function Footer() {
  const { dict } = useI18n();

  return (
    <footer className="bg-emerald-950 text-emerald-100 border-t border-emerald-900/40 pt-16 pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md">
                <span className="text-xl">🌿</span>
              </div>
              <span className="text-xl font-black tracking-tight text-white font-sans">
                AGROCONNECT
              </span>
            </Link>
            <p className="text-sm text-emerald-200/80 leading-relaxed max-w-md">
              A plataforma líder em inovação e capacitação para a agricultura em Angola. Conectando conhecimento e mercado.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Angola • 18 Províncias Cobertas</span>
            </div>
          </div>

          {/* Column 1: Ecossistema */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Ecossistema
            </h4>
            <ul className="space-y-2.5 text-xs text-emerald-200/80 font-medium">
              <li>
                <Link href="/agriexpert" className="hover:text-white transition-colors">
                  AgriExpert
                </Link>
              </li>
              <li>
                <Link href="/agriacademy" className="hover:text-white transition-colors">
                  AgriAcademy
                </Link>
              </li>
              <li>
                <Link href="/agrishopping" className="hover:text-white transition-colors">
                  AgriShopping
                </Link>
              </li>
              <li>
                <Link href="/agrilocalizacao" className="hover:text-white transition-colors">
                  AgriLocalização
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Suporte */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Suporte
            </h4>
            <ul className="space-y-2.5 text-xs text-emerald-200/80 font-medium">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-8 border-t border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400 gap-4">
          <p>© 2026 AGROCONNECT. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1 font-semibold text-emerald-300">
            <span>Feito em Angola 🇦🇴</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
