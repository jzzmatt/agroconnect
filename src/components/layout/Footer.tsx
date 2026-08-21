"use client";

import React from "react";
import Link from "next/link";
import { Sprout, MapPin, Mail, Phone, Heart } from "lucide-react";
import { useI18n } from "@/i18n/provider";

export function Footer() {
  const { dict } = useI18n();

  return (
    <footer className="bg-emerald-950 text-emerald-100 border-t border-emerald-900/40 pt-16 pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md">
                <Sprout className="w-6 h-6 text-emerald-300" />
              </div>
              <span className="text-xl font-black tracking-tight text-white font-sans">
                AGROCONNECT
              </span>
            </Link>
            <p className="text-sm text-emerald-200/80 leading-relaxed max-w-sm">
              {dict.landing.heroSubtitle}
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Angola • 18 Províncias Cobertas</span>
            </div>
          </div>

          {/* Pillar 1: AgriExpert */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {dict.pillars.agriExpert.name}
            </h4>
            <ul className="space-y-2 text-xs text-emerald-200/70">
              <li>
                <Link href="/agriexpert" className="hover:text-white transition-colors">
                  Agrónomos
                </Link>
              </li>
              <li>
                <Link href="/agriexpert" className="hover:text-white transition-colors">
                  Médicos Veterinários
                </Link>
              </li>
              <li>
                <Link href="/agriexpert" className="hover:text-white transition-colors">
                  Consultores Agrícolas
                </Link>
              </li>
              <li>
                <Link href="/agriexpert" className="hover:text-white transition-colors">
                  Consultoria de Solo
                </Link>
              </li>
            </ul>
          </div>

          {/* Pillar 2: AgriAcademy */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {dict.pillars.agriAcademy.name}
            </h4>
            <ul className="space-y-2 text-xs text-emerald-200/70">
              <li>
                <Link href="/agriacademy" className="hover:text-white transition-colors">
                  Cursos de Horticultura
                </Link>
              </li>
              <li>
                <Link href="/agriacademy" className="hover:text-white transition-colors">
                  Maneio de Bovinos
                </Link>
              </li>
              <li>
                <Link href="/agriacademy" className="hover:text-white transition-colors">
                  Avicultura Moderna
                </Link>
              </li>
              <li>
                <Link href="/agriacademy" className="hover:text-white transition-colors">
                  Gestão de Fazendas
                </Link>
              </li>
            </ul>
          </div>

          {/* Pillar 3 & Service: AgriShopping & AgriLocalização */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {dict.pillars.agriShopping.name}
            </h4>
            <ul className="space-y-2 text-xs text-emerald-200/70">
              <li>
                <Link href="/agrishopping" className="hover:text-white transition-colors">
                  Sementes e Adubos
                </Link>
              </li>
              <li>
                <Link href="/agrishopping" className="hover:text-white transition-colors">
                  Máquinas e Irrigação
                </Link>
              </li>
              <li>
                <Link href="/agrilocalizacao" className="hover:text-white transition-colors text-emerald-400 font-semibold">
                  AgriLocalização (Mapa)
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  {dict.navigation.pricing}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-8 border-t border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400 gap-4">
          <p>© 2026 AGROCONNECT. {dict.common.allRightsReserved}</p>
          <p className="flex items-center gap-1">
            <span>Desenvolvido para o agronegócio em Angola</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
