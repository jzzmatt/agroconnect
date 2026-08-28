"use client";

import React, { useState } from "react";
import { FileDown, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  buildOrderReceiptEml,
  buildOrderReceiptHtml,
  buildOrderReceiptText,
} from "@/lib/commerce/order-receipt";
import { useI18n } from "@/i18n/provider";
import type { OrderDescriptor } from "@/types/commerce";

function printReceiptHtml(html: string): boolean {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Comprovativo AgriConnect");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const runPrint = () => {
    if (printed) return;
    printed = true;
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 60_000);
  };

  iframe.onload = runPrint;
  window.setTimeout(runPrint, 250);
  return true;
}

function downloadBlob(contents: string, filename: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function OrderReceiptActions({ order }: { order: OrderDescriptor }) {
  const { dict } = useI18n();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const savePdf = () => {
    setMessage(null);
    const html = buildOrderReceiptHtml(order);
    if (printReceiptHtml(html)) return;
    downloadBlob(html, `AgriConnect-Pedido-${order.order_number}.html`, "text/html;charset=utf-8");
    setMessage(dict.commerceReceipt.pdfDownloaded);
  };

  const sendEmail = () => {
    const to = email.trim();
    downloadBlob(
      buildOrderReceiptEml(order, to),
      `AgriConnect-Pedido-${order.order_number}.eml`,
      "message/rfc822"
    );
    const subject = encodeURIComponent(`AgriConnect — Pedido ${order.order_number}`);
    const body = encodeURIComponent(buildOrderReceiptText(order));
    window.location.href = to
      ? `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    setMessage(dict.commerceReceipt.emailPrepared);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="button" variant="outline" onClick={savePdf} className="gap-1.5 font-bold">
          <FileDown className="w-4 h-4" />
          <span>{dict.commerceReceipt.savePdf}</span>
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={dict.commerceReceipt.emailPlaceholder}
          className="flex-1 rounded-xl border border-input-border bg-surface px-3 py-2 text-sm"
        />
        <Button type="button" variant="primary" onClick={sendEmail} className="gap-1.5 font-bold">
          <Mail className="w-4 h-4" />
          <span>{dict.commerceReceipt.sendEmail}</span>
        </Button>
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
