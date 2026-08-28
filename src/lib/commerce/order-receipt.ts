import type { OrderDescriptor, OrderItemDescriptor } from "@/types/commerce";

export function formatOrderMoney(value: number, currency = "AOA"): string {
  return `${new Intl.NumberFormat("pt-AO").format(value)} ${currency}`;
}

export function buildOrderReceiptText(order: OrderDescriptor): string {
  const lines = [
    "AgriConnect — Comprovativo de compra",
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
    body { font-family: Arial, sans-serif; color: #111; padding: 32px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .muted { color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <h1>AgriConnect</h1>
  <p class="muted">Comprovativo de compra</p>
  <p><strong>Pedido ${escapeHtml(order.order_number)}</strong><br/>
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
