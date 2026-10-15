"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    setInstalled(isStandalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setInstallPrompt(null);
      return;
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const message = isIOS
      ? 'Para instalar: toque em "Partilhar" no Safari e escolha "Adicionar ao ecrã principal".'
      : 'Para instalar: abra o menu do navegador (⋮) e escolha "Instalar aplicação" ou "Adicionar ao ecrã inicial". Se a opção não aparecer, abra o site no Chrome e tente novamente.';
    window.alert(message);
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      aria-label="Instalar Agroconnect no telemóvel"
      title="Instalar Agroconnect"
      className="fixed bottom-20 right-4 z-[80] inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-xl transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:bottom-6 sm:right-6"
    >
      {installPrompt ? <Download className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
      <span>Instalar aplicação</span>
    </button>
  );
}
