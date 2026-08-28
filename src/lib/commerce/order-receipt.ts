import type { OrderDescriptor, OrderItemDescriptor } from "@/types/commerce";

/** Inline mark matching the AgriConnect navbar (green tile + sprout). */
export const AGRICONNECT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" role="img" aria-label="AgriConnect">
  <rect width="40" height="40" rx="10" fill="#15803d"/>
  <g fill="none" stroke="#bbf7d0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" transform="translate(8 8) scale(1)">
    <path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/>
    <path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/>
    <path d="M5 21h14"/>
  </g>
</svg>`;

export function agriconnectReceiptHeaderHtml(): string {
  return `<div class="brand">
    ${AGRICONNECT_LOGO_SVG}
    <div>
      <div class="brand-name">AGROCONNECT</div>
      <div class="brand-sub">Angola · Ecossistema Digital para Agricultura</div>
    </div>
  </div>`;
}

export function formatOrderMoney(value: number, currency = "AOA"): string {
  return `${new Intl.NumberFormat("pt-AO").format(value)} ${currency}`;
}

export function buildOrderReceiptText(order: OrderDescriptor): string {
  const lines = [
    "AGROCONNECT",
    "Angola · Ecossistema Digital para Agricultura",
    "────────────────────────────────────────",
    "Comprovativo de compra",
    `Pedido ${order.order_number}`,
    `Data: ${new Date(order.created_at).toLocaleString("pt-AO")}`,
    `Estado: ${order.status}`,
    `Pagamento: ${order.payment_status}`,
    `Entrega: ${order.fulfillment_method === "delivery" ? "Entrega na morada" : "Ponto de recolha"}`,
    "",
    "Artigos:",
    ...order.items.map(
      (item: OrderItemDescriptor) =>
        `- ${item.quantity} × ${item.product_title} (${formatOrderMoney(item.unit_price, item.currency)}) = ${formatOrderMoney(item.subtotal, item.currency)}`
    ),
    "",
    `Subtotal: ${formatOrderMoney(order.subtotal, order.currency)}`,
    `Entrega: ${formatOrderMoney(order.delivery_fee, order.currency)}`,
    `Total: ${formatOrderMoney(order.total, order.currency)}`,
  ];

  if (order.shipping_address) {
    lines.push(
      "",
      "Morada:",
      `${order.shipping_address.recipient_name}`,
      `${order.shipping_address.address_line}`,
      `${order.shipping_address.municipality_name || ""} ${order.shipping_address.province_name || ""}`.trim(),
      order.shipping_address.phone
    );
  }

  return lines.join("\n");
}

export function buildOrderReceiptHtml(order: OrderDescriptor): string {
  const items = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.product_title)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(formatOrderMoney(item.subtotal, item.currency))}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>Pedido ${escapeHtml(order.order_number)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; padding: 32px; margin: 0; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #15803d; }
    .brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .brand-sub { color: #15803d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .muted { color: #6b7280; font-size: 13px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  ${agriconnectReceiptHeaderHtml()}
  <h1>Comprovativo de compra</h1>
  <p class="muted"><strong>Pedido ${escapeHtml(order.order_number)}</strong><br/>
  ${escapeHtml(new Date(order.created_at).toLocaleString("pt-AO"))}</p>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Artigo</th>
        <th>Qtd</th>
        <th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
  </table>
  <p style="margin-top:16px;"><strong>Total: ${escapeHtml(formatOrderMoney(order.total, order.currency))}</strong></p>
</body>
</html>`;
}

export function buildOrderReceiptEml(order: OrderDescriptor, to = ""): string {
  const subject = `AgriConnect — Pedido ${order.order_number}`;
  const html = buildOrderReceiptHtml(order);
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
  ].join("\r\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
