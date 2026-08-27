"use client";

import React, { useCallback, useState } from "react";
import { Share2, Link2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ShareLinkProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  size?: "sm" | "default";
}

function buildWhatsAppUrl(url: string, text?: string): string {
  const message = text ? `${text} ${url}` : url;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function buildFacebookUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function ShareLink({ url, title, text, className, size = "sm" }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures
    }
  }, [url]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title, text });
      } catch {
        // user dismissed share sheet
      }
    }
  }, [url, title, text]);

  const buttonSize = size === "sm" ? "sm" : "default";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <a href={buildWhatsAppUrl(url, text || title)} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size={buttonSize} className="gap-1.5 text-xs font-bold">
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </Button>
      </a>
      <a href={buildFacebookUrl(url)} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size={buttonSize} className="gap-1.5 text-xs font-bold">
          <Share2 className="w-3.5 h-3.5" />
          Facebook
        </Button>
      </a>
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleCopy}
        className="gap-1.5 text-xs font-bold"
      >
        <Link2 className="w-3.5 h-3.5" />
        {copied ? "Copiado!" : "Copiar link"}
      </Button>
      {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
        <Button
          variant="outline"
          size={buttonSize}
          onClick={handleNativeShare}
          className="gap-1.5 text-xs font-bold"
        >
          <Share2 className="w-3.5 h-3.5" />
          Partilhar
        </Button>
      ) : null}
    </div>
  );
}
