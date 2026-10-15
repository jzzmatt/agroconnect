"use client";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export type InstallPhase = "ready" | "installed" | "standalone";
export type InstallPlatform = "ios" | "other";

export interface InstallSnapshot {
  phase: InstallPhase;
  platform: InstallPlatform;
  prompt: BeforeInstallPromptEvent | null;
}

const SERVER_SNAPSHOT: InstallSnapshot = {
  phase: "ready",
  platform: "other",
  prompt: null,
};

let snapshot: InstallSnapshot = SERVER_SNAPSHOT;
const subscribers = new Set<() => void>();
let started = false;
let displayMedia: MediaQueryList | null = null;

function emit(next: InstallSnapshot) {
  snapshot = next;
  subscribers.forEach((subscriber) => subscriber());
}

export function isIosNavigator(nav: Navigator): boolean {
  const ua = nav.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  const platform = nav.platform || "";
  return platform === "MacIntel" && nav.maxTouchPoints > 1;
}

export function isStandaloneDisplay(win: Window & typeof globalThis): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  if (typeof win.matchMedia !== "function") return false;
  return (
    win.matchMedia("(display-mode: standalone)").matches ||
    win.matchMedia("(display-mode: fullscreen)").matches
  );
}

function onBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  if (snapshot.phase === "standalone" || snapshot.phase === "installed") return;
  const promptEvent = event as BeforeInstallPromptEvent;
  if (typeof promptEvent.prompt !== "function") return;
  emit({ ...snapshot, prompt: promptEvent, phase: "ready" });
}

function onAppInstalled() {
  if (snapshot.phase === "standalone") {
    if (snapshot.prompt) emit({ ...snapshot, prompt: null });
    return;
  }
  if (snapshot.phase === "installed" && snapshot.prompt === null) return;
  emit({ ...snapshot, phase: "installed", prompt: null });
}

function onDisplayModeChange() {
  if (typeof window === "undefined") return;
  if (!isStandaloneDisplay(window)) return;
  emit({ ...snapshot, phase: "standalone", prompt: null });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);
  if (typeof window.matchMedia === "function") {
    displayMedia = window.matchMedia("(display-mode: standalone)");
    if (typeof displayMedia.addEventListener === "function") {
      displayMedia.addEventListener("change", onDisplayModeChange);
    }
  }

  const platform: InstallPlatform = isIosNavigator(window.navigator) ? "ios" : "other";
  const phase: InstallPhase = isStandaloneDisplay(window) ? "standalone" : snapshot.phase;
  snapshot = { ...snapshot, platform, phase };
  queueMicrotask(() => {
    subscribers.forEach((subscriber) => subscriber());
  });
}

function stop() {
  if (started && typeof window !== "undefined") {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onAppInstalled);
    if (displayMedia && typeof displayMedia.removeEventListener === "function") {
      displayMedia.removeEventListener("change", onDisplayModeChange);
    }
  }
  displayMedia = null;
  started = false;
}

export function subscribeInstallStore(onStoreChange: () => void) {
  subscribers.add(onStoreChange);
  start();
  return () => {
    subscribers.delete(onStoreChange);
    if (subscribers.size === 0) stop();
  };
}

export function getInstallSnapshot() {
  return snapshot;
}

export function getInstallServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function clearInstallPrompt() {
  if (!snapshot.prompt) return;
  emit({ ...snapshot, prompt: null });
}

export function markAppInstalled() {
  onAppInstalled();
}

export function resetPwaInstallStoreForTests() {
  stop();
  snapshot = { ...SERVER_SNAPSHOT };
  subscribers.clear();
}
