"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VideoStorageMeter } from "@/components/academy/VideoStorageMeter";
import { AcademyVideoUploader } from "@/components/academy/AcademyVideoUploader";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { getAcademyStorageAction } from "@/lib/services/academy-video-actions";
import { can, subjectFromProfile } from "@/lib/authorization";

export default function AgriAcademyDashboardPage() {
  const { plan } = useAuthoritativePlan();
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof getAcademyStorageAction>> | null>(null);

  const refreshStorage = useCallback(() => {
    getAcademyStorageAction().then(setStorage).catch(() => setStorage(null));
  }, []);

  useEffect(() => {
    refreshStorage();
  }, [plan, refreshStorage]);

  const subject = subjectFromProfile({
    id: "",
    clerk_user_id: "",
    roles: [],
    account_type: "customer",
    subscription_plan: plan,
  });

  const canUploadVideo = can(subject, "academy.video.upload");
  const remainingBytes = storage ? Math.max(0, storage.limitBytes - storage.usedBytes) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">AgriAcademy</span>
        <h1 className="text-2xl font-black mt-1">Formação em vídeo</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Os ficheiros de vídeo são armazenados na infraestrutura Bunny. O AgriConnect guarda apenas metadados.
        </p>
      </div>

      {storage && (
        <VideoStorageMeter
          usedBytes={storage.usedBytes}
          limitBytes={storage.limitBytes}
          usedLabel={storage.usedLabel}
          limitLabel={storage.limitLabel}
          percent={storage.percent}
        />
      )}

      {canUploadVideo ? (
        <div className="bg-surface-card rounded-3xl border border-border p-6 space-y-4">
          <h2 className="text-sm font-bold">Adicionar vídeo</h2>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Selecionar ficheiro</li>
            <li>Validar tamanho e quota do plano</li>
            <li>Autorização segura de carregamento</li>
            <li>Carregamento direto para Bunny</li>
            <li>Processamento</li>
            <li>Pronto para reprodução</li>
          </ol>
          <AcademyVideoUploader remainingBytes={remainingBytes} onUploaded={refreshStorage} />
        </div>
      ) : (
        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 text-center space-y-4">
          <Lock className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="text-lg font-black">Criação de cursos bloqueada</h2>
          <p className="text-xs text-muted-foreground">
            Pode explorar a AgriAcademy no plano Básico. A criação de cursos e o armazenamento
            de vídeo estão disponíveis a partir do plano Profissional.
          </p>
          <Link href="/planos">
            <Button variant="primary" className="font-bold">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Atualizar plano
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
