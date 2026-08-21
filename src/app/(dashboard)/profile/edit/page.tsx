"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Input, SectionHeader } from "@/components/ui";
import { ANGOLA_PROVINCES, ANGOLA_KEY_MUNICIPALITIES } from "@/config/locations";
import { ArrowLeft, Save, Check } from "lucide-react";

export default function EditProfilePage() {
  const [displayName, setDisplayName] = useState("Dr. João Silva");
  const [phone, setPhone] = useState("+244 923 000 000");
  const [province, setProvince] = useState("Huambo");
  const [municipality, setMunicipality] = useState("Caála");
  const [bio, setBio] = useState(
    "Médico veterinário com mais de 12 anos de experiência em reprodução bovina, sanidade animal e gestão pecuária no Planalto Central de Angola."
  );
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const availableMunicipalities = ANGOLA_KEY_MUNICIPALITIES.filter(
    (m) => m.provinceName.toLowerCase() === province.toLowerCase()
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/profile" className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Perfil</span>
        </Link>
        <span className="text-xs font-semibold text-emerald-700">Edição de Perfil</span>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-xs">
        <h2 className="text-xl font-bold text-emerald-950 mb-6">
          Atualizar Dados do Perfil
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Nome de Apresentação
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Telefone (Angola)
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+244 9XX XXX XXX"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-950 mb-1">
                Província
              </label>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setMunicipality("");
                }}
                className="w-full text-xs bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-950 font-medium"
              >
                {ANGOLA_PROVINCES.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-950 mb-1">
                Município
              </label>
              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="w-full text-xs bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-950 font-medium"
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

          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Biografia e Especialidades
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-emerald-200 p-3 text-xs text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            {saved ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600" />
                Alterações guardadas com sucesso!
              </span>
            ) : (
              <div />
            )}

            <Button type="submit" variant="primary" className="gap-1.5 font-bold">
              <Save className="w-4 h-4" />
              <span>Guardar Alterações</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
