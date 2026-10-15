import React from "react";
import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { getDictionary } from "@/i18n";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { OfflineNotice } from "@/components/pwa/OfflineNotice";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { resetPwaInstallStoreForTests } from "@/components/pwa/install-store";

const DESKTOP_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
}

function setMatchMedia(standalone: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: standalone && query.includes("display-mode: standalone"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function renderInstall(locale: "pt" | "en" = "pt") {
  return render(
    <I18nProvider initialLocale={locale}>
      <InstallAppButton />
    </I18nProvider>
  );
}

function createInstallEvent(outcome: "accepted" | "dismissed", prompt = vi.fn().mockResolvedValue(undefined)) {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: "web" }),
  });
  return { event, prompt };
}

describe("PWA install button", () => {
  beforeEach(() => {
    cleanup();
    resetPwaInstallStoreForTests();
    setUserAgent(DESKTOP_UA);
    setMatchMedia(false);
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    Object.defineProperty(window.navigator, "platform", { value: "Linux armv8l", configurable: true });
    Object.defineProperty(window.navigator, "maxTouchPoints", { value: 5, configurable: true });
    Object.defineProperty(window.navigator, "standalone", { value: false, configurable: true });
  });

  afterEach(() => {
    cleanup();
    resetPwaInstallStoreForTests();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders the install action when installation can be offered", async () => {
    renderInstall("pt");
    expect(screen.getByRole("button", { name: "Instalar aplicação" })).toBeInTheDocument();

    const { event } = createInstallEvent("dismissed");
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    const button = await screen.findByRole("button", { name: "Instalar aplicação" });
    expect(button.className).toContain("bg-orange-500");
    expect(button.className).toContain("motion-safe:animate-install-cta");
  });

  it("invokes the native prompt and confirms only an accepted installation", async () => {
    renderInstall("pt");
    const { event, prompt } = createInstallEvent("accepted");
    window.dispatchEvent(event);

    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicação" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status")).toHaveTextContent("Aplicação já instalada");
    expect(screen.queryByRole("button", { name: "Instalar aplicação" })).not.toBeInTheDocument();
  });

  it("does not report installation when the prompt is dismissed", async () => {
    renderInstall("pt");
    const { event, prompt } = createInstallEvent("dismissed");
    window.dispatchEvent(event);

    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicação" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Aplicação já instalada")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Instalar aplicação" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicação" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("shows manual installation instructions when the browser has no native prompt", () => {
    renderInstall("pt");
    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicação" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Abra o Agroconnect no Chrome.");
    expect(dialog).toHaveTextContent("Abra o menu do navegador.");
    expect(dialog).toHaveTextContent("Adicionar ao ecrã principal");
    expect(dialog).toHaveTextContent("variam consoante o sistema operativo e o navegador");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows Safari instructions first on iPhone and iPad", () => {
    setUserAgent(IOS_UA);
    Object.defineProperty(window.navigator, "platform", { value: "iPhone", configurable: true });
    renderInstall("en");

    fireEvent.click(screen.getByRole("button", { name: "Install application" }));

    const dialog = screen.getByRole("dialog");
    const text = dialog.textContent ?? "";
    expect(text.indexOf("iPhone and iPad")).toBeGreaterThan(-1);
    expect(text.indexOf("iPhone and iPad")).toBeLessThan(text.indexOf("Android"));
    expect(dialog).toHaveTextContent("Open Agroconnect in Safari.");
    expect(dialog).toHaveTextContent("Tap Share.");
    expect(dialog).toHaveTextContent("Add to Home Screen");
    expect(dialog).toHaveTextContent("Confirm the installation.");
  });

  it("hides the install button when the app is already running standalone", async () => {
    setMatchMedia(true);
    renderInstall("pt");

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Instalar aplicação" })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("updates the UI when the browser fires appinstalled", async () => {
    renderInstall("en");
    expect(screen.getByRole("button", { name: "Install application" })).toBeInTheDocument();

    window.dispatchEvent(new Event("appinstalled"));

    expect(await screen.findByRole("status")).toHaveTextContent("Application already installed");
    expect(screen.queryByRole("button", { name: "Install application" })).not.toBeInTheDocument();
  });

  it("removes install listeners when the component unmounts", async () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const view = renderInstall("pt");

    await waitFor(() => {
      expect(add.mock.calls.some((call) => call[0] === "beforeinstallprompt")).toBe(true);
      expect(add.mock.calls.some((call) => call[0] === "appinstalled")).toBe(true);
    });

    const before = add.mock.calls.find((call) => call[0] === "beforeinstallprompt");
    const installed = add.mock.calls.find((call) => call[0] === "appinstalled");
    view.unmount();

    expect(remove).toHaveBeenCalledWith("beforeinstallprompt", before?.[1]);
    expect(remove).toHaveBeenCalledWith("appinstalled", installed?.[1]);
  });

  it("renders Portuguese and English install copy", () => {
    const { unmount } = renderInstall("pt");
    expect(screen.getByRole("button", { name: "Instalar aplicação" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicação" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Abra o Agroconnect no Chrome.");
    expect(screen.getByRole("dialog")).toHaveTextContent("variam consoante o sistema operativo e o navegador");
    unmount();
    resetPwaInstallStoreForTests();

    renderInstall("en");
    expect(screen.getByRole("button", { name: "Install application" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Install application" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Open Agroconnect in Chrome.");
    expect(screen.getByRole("dialog")).toHaveTextContent("vary by operating system and browser");

    expect(getDictionary("pt").pwa.install).toBe("Instalar aplicação");
    expect(getDictionary("en").pwa.install).toBe("Install application");
    expect(getDictionary("pt").pwa.offlineTitle).toBe("Sem ligação à internet");
    expect(getDictionary("en").pwa.offlineTitle).toBe("No internet connection");
    expect(getDictionary("fr").pwa.install).toBe("Installer l'application");
  });

  it("explains that installation is unavailable outside a secure context", () => {
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
    renderInstall("en");
    fireEvent.click(screen.getByRole("button", { name: "Install application" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Installation unavailable");
    expect(screen.queryByText("Open Agroconnect in Chrome.")).not.toBeInTheDocument();
  });

  it("reports an installation error without claiming success", async () => {
    renderInstall("pt");
    const { event, prompt } = createInstallEvent("accepted", vi.fn().mockRejectedValue(new Error("blocked")));
    window.dispatchEvent(event);

    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicação" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível iniciar a instalação. Tente novamente pelo menu do navegador."
    );
    expect(screen.queryByText("Aplicação já instalada")).not.toBeInTheDocument();
  });

  it("shows the offline notice when the browser reports no connection", () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    render(
      <I18nProvider initialLocale="en">
        <OfflineNotice />
      </I18nProvider>
    );
    expect(screen.getByRole("status")).toHaveTextContent("No internet connection");
    expect(screen.getByRole("status")).toHaveTextContent("do not work without a network");
  });

  it("registers the service worker only in production", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });

    const devView = render(<ServiceWorkerRegistrar />);
    await Promise.resolve();
    expect(register).not.toHaveBeenCalled();
    devView.unmount();

    vi.stubEnv("NODE_ENV", "production");
    render(<ServiceWorkerRegistrar />);
    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" })
    );
  });
});

describe("PWA manifest and offline shell", () => {
  const root = process.cwd();

  it("ships a manifest whose icons exist at the declared sizes", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/manifest.json"), "utf8")) as {
      name: string;
      short_name: string;
      lang: string;
      start_url: string;
      scope: string;
      display: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };

    expect(manifest.name).toBe("AGROCONNECT — Ecossistema Digital para Agricultura");
    expect(manifest.short_name).toBe("Agroconnect");
    expect(manifest.lang).toBe("pt-AO");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#0E6B38");
    expect(manifest.icons.some((icon) => icon.type === "image/png" && icon.sizes === "192x192")).toBe(true);
    expect(manifest.icons.some((icon) => icon.type === "image/png" && icon.sizes === "512x512")).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);

    for (const icon of manifest.icons) {
      const file = path.join(root, "public", icon.src);
      expect(fs.existsSync(file), icon.src).toBe(true);
      if (icon.type === "image/png") {
        const buf = fs.readFileSync(file);
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        const [declaredWidth, declaredHeight] = icon.sizes.split("x").map(Number);
        expect(width).toBe(declaredWidth);
        expect(height).toBe(declaredHeight);
      }
    }
  });

  it("keeps the service worker from caching private responses", () => {
    const source = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
    expect(source).toContain('path.startsWith("/api/")');
    expect(source).toContain('request.headers.has("authorization")');
    expect(source).toContain('if (request.mode === "navigate") return;');
    expect(source).toContain('"/offline.html"');
    expect(source).not.toContain("respondWith(\n      fetch(request)");
    expect(source).not.toContain('"/dashboard"');
    expect(fs.existsSync(path.join(root, "public/offline.html"))).toBe(true);
  });
});
