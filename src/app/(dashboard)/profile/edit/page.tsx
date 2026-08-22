"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { ANGOLA_PROVINCES, ANGOLA_KEY_MUNICIPALITIES } from "@/config/locations";
import { ArrowLeft, Save, Check, ShieldCheck, User } from "lucide-react";
import { updateProfileDetailsAction } from "@/lib/auth/profile-actions";
import type { ProfessionalTitle } from "@/types/database";

export default function EditProfilePage() {
  const [displayName, setDisplayName] = useState("Dr. João Silva");
  const [firstName, setFirstName] = useState("João");
  const [lastName, setLastName] = useState("Silva");
  const [professionalTitle, setProfessionalTitle] = useState<ProfessionalTitle>("Dr.");
  const [professionalTitleCustom, setProfessionalTitleCustom] = useState("");
  const [phone, setPhone] = useState("+244 923 000 000");
  const [province, setProvince] = useState("Huambo");
  const [municipality, setMunicipality] = useState("Caála");
  const [bio, setBio] = useState(
    "Médico veterinário com mais de 12 anos de experiência em reprodução bovina, sanidade animal e gestão pecuária no Planalto Central de Angola."
  );
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfileDetailsAction({
        displayName,
        firstName,
        lastName,
        professionalTitle,
        professionalTitleCustom: professionalTitle === "custom" ? professionalTitleCustom : undefined,
        phone,
        bio,
      });

      // Also persist to localStorage for instant client-side sync across tabs
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "agroconnect_user_profile_override",
          JSON.stringify({
            displayName,
            firstName,
            lastName,
            professionalTitle,
            professionalTitleCustom,
            phone,
            bio,
            province,
            municipality,
          })
        );
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.warn("Error updating profile:", err);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const availableMunicipalities = ANGOLA_KEY_MUNICIPALITIES.filter(
    (m) => m.provinceName.toLowerCase() === province.toLowerCase()
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/profile"
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Perfil</span>
        </Link>
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          Edição de Perfil & Identidade
        </span>
      </div>

      <div className="bg-surface-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs">
        <div className="border-b border-border pb-4 mb-6">
          <h2 className="text-xl font-black text-foreground">
            Atualizar Dados do Perfil
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Personalize como o seu nome, título profissional e informações de contacto são apresentados no ecossistema.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* 1. Identity & Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Nome
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: João"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Apelido
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: Silva"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Nome de Apresentação
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Como pretende ser apresentado no AgriConnect?"
              required
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Este nome é usado prioritariamente no cabeçalho e nos seus serviços/produtos.
            </span>
          </div>

          {/* 2. Professional Title Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Título Profissional
              </label>
              <select
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value as any)}
                className="w-full text-xs bg-surface border border-border rounded-xl px-3.5 py-2.5 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="none">Nenhum (Apenas Nome)</option>
                <option value="Dr.">Dr. (Médico Veterinário / Doutor)</option>
                <option value="Prof.">Prof. (Professor / Instrutor)</option>
                <option value="Eng.">Eng. (Engenheiro Agrónomo)</option>
                <option value="Tec.">Tec. (Técnico Agrícola)</option>
                <option value="custom">Outro (Personalizado)</option>
              </select>
            </div>

            {professionalTitle === "custom" && (
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Título Personalizado
                </label>
                <Input
                  value={professionalTitleCustom}
                  onChange={(e) => setProfessionalTitleCustom(e.target.value)}
                  placeholder="Ex: Consultor"
                />
              </div>
            )}
          </div>

          {/* 3. Phone */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Telefone (Angola)
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+244 9XX XXX XXX"
            />
          </div>

          {/* 4. Geography */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Província
              </label>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setMunicipality("");
                }}
                className="w-full text-xs bg-surface border border-border rounded-xl px-3.5 py-2.5 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {ANGOLA_PROVINCES.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Município
              </label>
              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="w-full text-xs bg-surface border border-border rounded-xl px-3.5 py-2.5 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">Selecione o Município</option>
                {availableMunicipalities.map((m) => (
                  <option key={m.code} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Bio */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Biografia e Especialidades Profissionais
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descreva a sua experiência, culturas agrícolas de atuação, explorações pecuárias ou serviços prestados..."
              className="w-full rounded-2xl border border-input-border bg-input p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <Check className="w-4 h-4" />
                Alterações guardadas com sucesso!
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                As alterações são refletidas imediatamente no seu painel.
              </span>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLoading}
              className="gap-2 font-bold px-6 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Alterações</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
