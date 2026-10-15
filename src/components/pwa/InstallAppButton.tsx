"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import {
  clearInstallPrompt,
  getInstallServerSnapshot,
  getInstallSnapshot,
  markAppInstalled,
  subscribeInstallStore,
  type InstallPlatform,
  type InstallSnapshot,
} from "./install-store";

type InstallAppButtonProps = {
  variant?: "button" | "menu";
  className?: string;
};

export function InstallAppButton({ variant = "button", className }: InstallAppButtonProps) {
  const { dict } = useI18n();
  const live = useSyncExternalStore(
    subscribeInstallStore,
    getInstallSnapshot,
    getInstallServerSnapshot
  );
  const [hydrated, setHydrated] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installError, setInstallError] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const snapshot: InstallSnapshot = hydrated ? live : getInstallServerSnapshot();

  useEffect(() => {
    if (snapshot.phase === "installed" || snapshot.phase === "standalone") {
      setHelpOpen(false);
    }
  }, [snapshot.phase]);

  useEffect(() => {
    if (!helpOpen) return;
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelpOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [helpOpen]);

  if (snapshot.phase === "standalone") return null;

  async function handleInstall() {
    setInstallError(false);
    const deferred = getInstallSnapshot().prompt;
    if (!deferred) {
      setHelpOpen(true);
      return;
    }

    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      clearInstallPrompt();
      if (choice.outcome === "accepted") {
        markAppInstalled();
        return;
      }
    } catch {
      clearInstallPrompt();
      setInstallError(true);
      setHelpOpen(true);
    }
  }

  const label = dict.pwa.install;

  return (
    <>
      {snapshot.phase === "installed" ? (
        <p
          role="status"
          className={cn(
            "text-sm font-semibold text-primary",
            variant === "menu" && "px-1 py-2 text-center",
            className
          )}
        >
          {dict.pwa.installed}
        </p>
      ) : (
        <Button
          type="button"
          variant="primary"
          className={cn("min-h-11 gap-2 font-bold touch-manipulation", variant === "menu" && "w-full", className)}
          onClick={() => {
            void handleInstall();
          }}
          aria-label={label}
          aria-haspopup={snapshot.prompt ? undefined : "dialog"}
          aria-expanded={snapshot.prompt ? undefined : helpOpen}
        >
          {snapshot.prompt ? (
            <Download className="h-4 w-4" aria-hidden />
          ) : (
            <Smartphone className="h-4 w-4" aria-hidden />
          )}
          <span>{label}</span>
        </Button>
      )}
      {helpOpen ? (
        <InstallInstructions
          titleId={titleId}
          platform={snapshot.platform}
          installError={installError}
          closeRef={closeRef}
          onClose={() => setHelpOpen(false)}
        />
      ) : null}
    </>
  );
}

function InstallInstructions({
  titleId,
  platform,
  installError,
  closeRef,
  onClose,
}: {
  titleId: string;
  platform: InstallPlatform;
  installError: boolean;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const { dict } = useI18n();
  if (typeof document === "undefined") return null;

  const insecure = window.isSecureContext === false;
  const androidSteps = [dict.pwa.androidStep1, dict.pwa.androidStep2, dict.pwa.androidStep3];
  const iosSteps = [dict.pwa.iosStep1, dict.pwa.iosStep2, dict.pwa.iosStep3, dict.pwa.iosStep4];
  const sections =
    platform === "ios"
      ? [
          { title: dict.pwa.iosTitle, steps: iosSteps },
          { title: dict.pwa.androidTitle, steps: androidSteps },
        ]
      : [
          { title: dict.pwa.androidTitle, steps: androidSteps },
          { title: dict.pwa.iosTitle, steps: iosSteps },
        ];

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface-elevated p-5 text-foreground shadow-xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-black tracking-tight">
          {dict.pwa.instructionsTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dict.pwa.supportVaries}</p>
        {installError ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
            {dict.pwa.installError}
          </p>
        ) : null}
        {insecure ? (
          <p className="mt-3 text-sm font-semibold text-foreground">{dict.pwa.unavailable}</p>
        ) : (
          <div className="mt-4 space-y-4">
            {sections.map((section) => (
              <section key={section.title}>
                <h3 className="text-sm font-bold text-primary">{section.title}</h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
        <Button
          ref={closeRef}
          type="button"
          variant="outline"
          className="mt-5 min-h-11 w-full font-bold"
          onClick={onClose}
        >
          {dict.common.close}
        </Button>
      </div>
    </div>,
    document.body
  );
}
