"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign,
  BookOpen,
  Calendar,
  ShoppingBag,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Star,
} from "lucide-react";
import { MetricCard, Button } from "@/components/ui";

export default function DashboardPage() {
  // Figma Reference KPI Metrics
  const kpiCards = [
    {
      title: "Ganhos Totais",
      value: "2.450.000 Kz",
      description: "em relação ao mês anterior",
      trend: { value: "12.5% este mês", isPositive: true },
      icon: DollarSign,
    },
    {
      title: "Venda de Cursos",
      value: "1.250.000 Kz",
      description: "AgriAcademy",
      trend: { value: "18.3% este mês", isPositive: true },
      icon: BookOpen,
    },
    {
      title: "Consultas Activas",
      value: "32 Agendadas",
      description: "AgriExpert",
      trend: { value: "4.7% este mês", isPositive: true },
      icon: Calendar,
    },
    {
      title: "Produtos Vendidos",
      value: "56 Items",
      description: "AgriShopping",
      trend: { value: "8.2% este mês", isPositive: true },
      icon: ShoppingBag,
    },
    {
      title: "Total Estudantes",
      value: "124 Alunos",
      description: "Inscritos nos seus cursos",
      trend: { value: "15.4% este mês", isPositive: true },
      icon: Users,
    },
  ];

  // Figma Reference Recent Activity
  const recentActivities = [
    {
      id: "act-1",
      title: "Inscrição no curso: Suinicultura Profissional",
      time: "Há 25 minutos",
      type: "academy",
      icon: BookOpen,
    },
    {
      id: "act-2",
      title: "Nova consulta agendada: Visita à Fazenda – Benguela",
      time: "Há 2 horas",
      type: "expert",
      icon: Calendar,
    },
    {
      id: "act-3",
      title: "Encomenda de produto: Sistema de Rega Automático",
      time: "Há 4 horas",
      type: "shopping",
      icon: ShoppingBag,
    },
    {
      id: "act-4",
      title: 'Classificação recebida: "Excelente esclarecimento!"',
      time: "Ontem às 16:40",
      type: "review",
      icon: Star,
    },
  ];

  // Figma Reference Upcoming Appointments
  const upcomingAppointments = [
    {
      id: "apt-1",
      date: "Amanhã, 09:00",
      title: "Visita Técnica • Fazenda Huambo",
      location: "Caála, Huambo",
      status: "CONFIRMADO",
    },
    {
      id: "apt-2",
      date: "15 de Maio, 14:00",
      title: "Vídeo Consulta • Produção de Milho",
      location: "Online",
      status: "CONFIRMADO",
    },
    {
      id: "apt-3",
      date: "18 de Maio, 10:00",
      title: "Análise de Solo • Malanje",
      location: "Cacuso, Malanje",
      status: "CONFIRMADO",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Painel de Controlo • AGROCONNECT
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
            Olá, Dr. João Silva 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aqui está o resumo da sua atividade profissional no ecossistema agrícola de Angola.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/agrilocalizacao">
            <Button variant="outline" className="text-xs font-bold gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>AgriLocalização</span>
            </Button>
          </Link>
          <Link href="/dashboard/expert/services">
            <Button variant="primary" className="text-xs font-bold">
              Novo Serviço
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI / Stat Cards (Figma Grid & Responsive Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi, idx) => (
          <MetricCard
            key={idx}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            trend={kpi.trend}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* Split Activity & Appointments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Próximos Agendamentos (Figma Left Column) */}
        <div className="lg:col-span-7 bg-surface-card rounded-3xl p-6 sm:p-7 border border-border shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-foreground">Próximos Agendamentos</h3>
            </div>
            <Link href="/dashboard/expert/appointments" className="text-xs font-bold text-primary hover:text-primary-hover">
              Ver todos
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 rounded-2xl bg-surface border border-border hover:border-border-strong transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">{apt.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{apt.title}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{apt.location}</span>
                  </p>
                </div>

                {/* Mobile & Desktop Confirmado Badge */}
                <div className="self-start sm:self-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-secondary text-secondary-foreground border border-border-subtle shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    <span>{apt.status}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Atividade Recente (Figma Right Column) */}
        <div className="lg:col-span-5 bg-surface-card rounded-3xl p-6 sm:p-7 border border-border shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-foreground">Atividade Recente</h3>
            </div>
          </div>

          <div className="space-y-3.5">
            {recentActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-surface border border-border text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="font-semibold text-foreground leading-snug">{act.title}</p>
                    <span className="text-[11px] text-muted-foreground block">{act.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
