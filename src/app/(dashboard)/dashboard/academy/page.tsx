"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VideoStorageMeter } from "@/components/academy/VideoStorageMeter";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { createAcademyVideoUploadAction, getAcademyStorageAction } from "@/lib/services/academy-video-actions";

export default function AgriAcademyDashboardPage() {
  const { entitlements, plan } = useAuthoritativePlan();
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof getAcademyStorageAction>> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getAcademyStorageAction().then(setStorage);
  }, [plan]);

  if (!entitlements.can_access_agriacademy) {
    return (
      <div className="max-w-4xl mx-auto bg-surface-card rounded-3xl p-10 border border-border text-center space-y-4">
        <Lock className="w-10 h-10 text-amber-600 mx-auto" />
        <h1 className="text-2xl font-black">AgriAcademy bloqueado</h1>
        <p className="text-xs text-muted-foreground">
          A criação de cursos e o armazenamento de vídeo estão disponíveis a partir do plano Profissional.
        </p>
        <Link href="/pricing">
          <Button variant="primary" className="font-bold">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Atualizar plano
          </Button>
        </Link>
      </div>
    );
  }

  const handleDemoUpload = async () => {
    try {
      const result = await createAcademyVideoUploadAction({
        title: "Aula de irrigação — rascunho",
        filename: "aula-irrigacao.mp4",
        mimeType: "video/mp4",
        fileSize: 50 * 1024 * 1024,
      });
      setMessage(
        result.upload.configured
          ? "Autorização Bunny gerada. Carregue o ficheiro diretamente para a infraestrutura de vídeo."
          : result.upload.error || "Metadados criados. Bunny Stream ainda não está configurado neste ambiente."
      );
      setStorage(await getAcademyStorageAction());
    } catch (err: any) {
      setMessage(err?.message || "Limite de armazenamento atingido.");
    }
  };

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
        <Button type="button" onClick={handleDemoUpload} className="font-bold text-xs">
          <Upload className="w-4 h-4 mr-1.5" />
          Iniciar carregamento seguro
        </Button>
        {message && <p className="text-xs font-semibold">{message}</p>}
      </div>
    </div>
  );
}
