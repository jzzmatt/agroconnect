"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  Calendar,
  BookOpen,
  TrendingUp,
  Award,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Package,
} from "lucide-react";
import { MetricCard, SectionHeader, Button, Badge } from "@/components/ui";
import { LocationBadge } from "@/components/location";
import { useI18n } from "@/i18n/provider";

export default function DashboardPage() {
  const { dict } = useI18n();

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-900/10 shadow-xs">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Painel de Controlo • Angola
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
            {dict.dashboard.welcome}
          </h1>
          <p className="text-sm text-emerald-800/80 mt-1">
            Gerencie os seus serviços no AgriExpert, cursos no AgriAcademy e produtos no AgriShopping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/agrilocalizacao">
            <Button variant="primary" className="bg-emerald-700 hover:bg-emerald-800 gap-1.5 font-bold shadow-xs">
              <MapPin className="w-4 h-4" />
              <span>Ver Mapa</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Consultorias Agendadas"
          value="6"
          description="2 agendadas para esta semana"
          icon={Calendar}
          trend={{ value: "12%", isPositive: true }}
        />
        <MetricCard
          title="Cursos em Andamento"
          value="3"
          description="85% de conclusão média"
          icon={BookOpen}
          trend={{ value: "4%", isPositive: true }}
        />
        <MetricCard
          title="Produtos no Mercado"
          value="14"
          description="AgriShopping Huambo / Luanda"
          icon={ShoppingBag}
        />
        <MetricCard
          title="Classificação Geral"
          value="4.9 / 5.0"
          description="Baseado em 48 avaliações"
          icon={Award}
          trend={{ value: "5.0", isPositive: true }}
        />
      </div>

      {/* Role-Specific Active Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AgriExpert Management Section */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-emerald-950">AgriExpert • Especialista</h3>
            </div>
            <Badge variant="pillarExpert">Ativo</Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Área de gestão de consultas veterinárias, sanidade animal e assistência agronómica.
          </p>

          <div className="space-y-2 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">Fazenda Esperança (Caála)</span>
                <span className="text-[11px] text-emerald-700">Consulta de Sanidade Bovina</span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                Amanhã, 10:00
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">Cooperativa Agro-Sul</span>
                <span className="text-[11px] text-emerald-700">Análise de Solo e Nutrição</span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                Quinta, 14:30
              </span>
            </div>
          </div>

          <Link href="/agriexpert" className="block pt-2">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs font-bold border-emerald-200">
              <span>Gerir Consultorias</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
            </Button>
          </Link>
        </div>

        {/* AgriAcademy Management Section */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-emerald-950">AgriAcademy • Aluno / Instrutor</h3>
            </div>
            <Badge variant="pillarAcademy">Ativo</Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Progresso nos cursos matriculados e estatísticas de formações publicadas.
          </p>

          <div className="space-y-2.5 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-emerald-950">Maneio Intensivo de Bovinos</span>
                <span className="font-bold text-emerald-700">75%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-3/4 rounded-full" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-emerald-950">Horticultura Comercial</span>
                <span className="font-bold text-emerald-700">40%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-2/5 rounded-full" />
              </div>
            </div>
          </div>

          <Link href="/agriacademy" className="block pt-2">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs font-bold border-blue-200 text-blue-900 hover:bg-blue-50">
              <span>Continuar Aprendizagem</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-700" />
            </Button>
          </Link>
        </div>

        {/* AgriShopping Management Section */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-emerald-950">AgriShopping • Vendedor</h3>
            </div>
            <Badge variant="pillarShopping">Ativo</Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Gestão rápida de produtos agrícolas listados, inventário e encomendas.
          </p>

          <div className="space-y-2 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">Sementes de Milho ZM-521</span>
                <span className="text-[11px] text-amber-800 font-medium">80 sacos em stock</span>
              </div>
              <span className="text-xs font-bold text-emerald-950">28.500 Kz</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">Bomba de Irrigação 3HP</span>
                <span className="text-[11px] text-amber-800 font-medium">12 unidades</span>
              </div>
              <span className="text-xs font-bold text-emerald-950">480.000 Kz</span>
            </div>
          </div>

          <Link href="/agrishopping" className="block pt-2">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs font-bold border-amber-200 text-amber-900 hover:bg-amber-50">
              <span>Ver Catálogo</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
