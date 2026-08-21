"use client";

import React from "react";
import Link from "next/link";
import { User, MapPin, Mail, Phone, ShieldCheck, Edit, Calendar } from "lucide-react";
import { Button, Badge, Avatar } from "@/components/ui";
import { LocationBadge } from "@/components/location";

export default function ProfilePage() {
  const mockUser = {
    displayName: "Dr. João Silva",
    title: "Médico Veterinário & Instrutor AgriAcademy",
    email: "joao.silva@agroconnect.ao",
    phone: "+244 923 000 000",
    province: "Huambo",
    municipality: "Caála",
    bio: "Médico veterinário com mais de 12 anos de experiência em reprodução bovina, sanidade animal e gestão pecuária no Planalto Central de Angola. Formador certificado na AgriAcademy.",
    roles: ["veterinarian", "expert", "instructor", "student"],
    activeSince: "Agosto 2026",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar
            fallbackText={mockUser.displayName}
            size="xl"
            className="w-20 h-20 text-2xl"
          />

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-emerald-950">
                {mockUser.displayName}
              </h1>
              <ShieldCheck className="w-5 h-5 text-emerald-600 fill-emerald-100" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">{mockUser.title}</p>
            <div className="flex items-center gap-2 pt-1">
              <LocationBadge
                provinceName={mockUser.province}
                municipalityName={mockUser.municipality}
                size="sm"
              />
              <span className="text-xs text-muted-foreground">Membro desde {mockUser.activeSince}</span>
            </div>
          </div>

          <Link href="/profile/edit">
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 font-bold">
              <Edit className="w-3.5 h-3.5" />
              <span>Editar Perfil</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Bio and Active Roles */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
              Biografia Profissional
            </h3>
            <p className="text-sm text-emerald-800/90 leading-relaxed">
              {mockUser.bio}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
              Funções Ativas no Ecossistema
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {mockUser.roles.map((role) => (
                <Badge key={role} variant="pillarExpert" className="px-3 py-1 text-xs capitalize">
                  {role.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Contact & Location details */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
              Contactos & Localização
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{mockUser.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-900">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mockUser.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-900">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mockUser.municipality}, {mockUser.province} • Angola</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
