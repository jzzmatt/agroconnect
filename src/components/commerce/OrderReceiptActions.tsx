"use client";

import React, { useState } from "react";
import { FileDown, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildOrderReceiptHtml, buildOrderReceiptText } from "@/lib/commerce/order-receipt";
import { useI18n } from "@/i18n/provider";
import type { OrderDescriptor } from "@/types/commerce";

export function OrderReceiptActions({ order }: { order: OrderDescriptor }) {
  const { dict } = useI18n();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const savePdf = () => {
    const html = buildOrderReceiptHtml(order);
    const frame = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!frame) return;
    frame.document.open();
    frame.document.write(html);
    frame.document.close();
    frame.focus();
    frame.print();
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`AgriConnect — Pedido ${order.order_number}`);
    const body = encodeURIComponent(buildOrderReceiptText(order));
    const to = email.trim();
    window.location.href = to
      ? `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
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
      {copied ? <p className="text-xs text-muted-foreground">{dict.commerceReceipt.emailOpened}</p> : null}
    </div>
  );
}
