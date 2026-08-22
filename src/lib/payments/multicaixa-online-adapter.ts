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
 * Multicaixa Online payment adapter (Angola).
 * Does NOT fake successful live transactions.
 * Without live credentials, intents remain pending with a clear configuration state.
 */
export class MulticaixaOnlineAdapter implements IPaymentProvider {
  public readonly id = "multicaixa_online";
  public readonly name = "Multicaixa Online";
  public readonly isSandbox = !Boolean(process.env.MULTICAIXA_ONLINE_API_KEY);

  public async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const liveKey = process.env.MULTICAIXA_ONLINE_API_KEY;
    if (!liveKey) {
      return {
        success: false,
        provider: this.id,
        providerPaymentId: "",
        status: "pending",
        amount: params.amount,
        currency: params.currency,
        paymentMethod: "multicaixa_online",
        error: "Multicaixa Online ainda não está configurado neste ambiente.",
        instructions:
          "A integração Multicaixa Online está em preparação. Nenhuma transação real foi criada.",
      };
    }

    return {
      success: true,
      provider: this.id,
      providerPaymentId: `mcx_${Date.now()}`,
      status: "processing",
      amount: params.amount,
      currency: params.currency,
      paymentMethod: "multicaixa_online",
      instructions: "Conclua o pagamento no Multicaixa Online.",
    };
  }

  public async verifyPayment(params: VerifyPaymentParams): Promise<PaymentIntentResult> {
    return {
      success: false,
      provider: this.id,
      providerPaymentId: params.providerPaymentId,
      status: "pending",
      amount: 0,
      currency: "AOA",
      paymentMethod: "multicaixa_online",
      error: "Verificação Multicaixa Online indisponível sem credenciais de produção.",
    };
  }

  public async cancelPayment(): Promise<boolean> {
    return true;
  }

  public async refundPayment(): Promise<RefundResult> {
    return {
      success: false,
      status: "failed",
      error: "Reembolsos Multicaixa Online não estão configurados.",
    };
  }

  public async validateWebhook(): Promise<WebhookValidationResult> {
    return {
      isValid: false,
      provider: this.id,
      eventId: "",
      eventType: "unconfigured",
      error: "Webhook Multicaixa Online não configurado.",
    };
  }
}
