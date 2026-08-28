import { paymentWebhookSecretMatches } from "@/lib/commerce/webhook-secret";
import type {
  IPaymentProvider,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  VerifyPaymentParams,
  RefundPaymentParams,
  RefundResult,
  WebhookValidationResult,
} from "./types";

/**
 * Development / Sandbox Mock Payment Adapter
 * Explicitly labeled as "Modo de Teste" with zero fake production transactions.
 */
export class SandboxPaymentAdapter implements IPaymentProvider {
  public readonly id = "sandbox_mock";
  public readonly name = "Pagamento de Teste (Ambiente de Desenvolvimento)";
  public readonly isSandbox = true;

  public async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    if (params.amount <= 0) {
      return {
        success: false,
        provider: this.id,
        providerPaymentId: "",
        status: "failed",
        amount: params.amount,
        currency: params.currency,
        paymentMethod: params.paymentMethod,
        error: "O montante do pagamento deve ser superior a zero.",
      };
    }

    const providerPaymentId = `sbx_pay_${Math.random().toString(36).substring(2, 10)}`;

    return {
      success: true,
      provider: this.id,
      providerPaymentId,
      status: "paid", // Instantly marks as confirmed in sandbox mode
      amount: params.amount,
      currency: params.currency,
      paymentMethod: params.paymentMethod,
      instructions: "Pagamento de teste concluído com sucesso no ambiente de simulação.",
    };
  }

  public async verifyPayment(params: VerifyPaymentParams): Promise<PaymentIntentResult> {
    return {
      success: true,
      provider: this.id,
      providerPaymentId: params.providerPaymentId,
      status: "paid",
      amount: 0,
      currency: "AOA",
      paymentMethod: "mock_sandbox",
    };
  }

  public async cancelPayment(params: VerifyPaymentParams): Promise<boolean> {
    return true;
  }

  public async refundPayment(params: RefundPaymentParams): Promise<RefundResult> {
    return {
      success: true,
      status: "refunded",
      refundId: `sbx_ref_${Math.random().toString(36).substring(2, 8)}`,
      amountRefunded: params.amount || 0,
    };
  }

  public async validateWebhook(
    payload: string,
    headers: Record<string, string>
  ): Promise<WebhookValidationResult> {
    if (!paymentWebhookSecretMatches(headers)) {
      return {
        isValid: false,
        provider: this.id,
        eventId: "",
        eventType: "unauthorized",
        error: "Assinatura de webhook inválida.",
      };
    }

    try {
      const parsed = JSON.parse(payload);
      return {
        isValid: true,
        provider: this.id,
        eventId: parsed.eventId || `evt_${Date.now()}`,
        eventType: parsed.eventType || "payment.confirmed",
        orderId: parsed.orderId,
        providerPaymentId: parsed.providerPaymentId,
        status: parsed.status || "paid",
        amount: parsed.amount,
        currency: parsed.currency || "AOA",
      };
    } catch {
      return {
        isValid: false,
        provider: this.id,
        eventId: "",
        eventType: "unknown",
        error: "Payload de webhook inválido.",
      };
    }
  }
}
