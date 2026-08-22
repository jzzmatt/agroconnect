import type {
  IPaymentProvider,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  VerifyPaymentParams,
  RefundPaymentParams,
  RefundResult,
  WebhookValidationResult,
} from "./types";
import { SandboxPaymentAdapter } from "./sandbox-adapter";

/**
 * Payment Service orchestrator
 * Decouples commerce logic from any specific gateway.
 */
export class PaymentService {
  private static providerInstance: IPaymentProvider | null = null;

  public static getProvider(): IPaymentProvider {
    if (!this.providerInstance) {
      // Default fallback is the safe development SandboxPaymentAdapter
      this.providerInstance = new SandboxPaymentAdapter();
    }
    return this.providerInstance;
  }

  public static setProvider(provider: IPaymentProvider): void {
    this.providerInstance = provider;
  }

  public static async createPayment(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const provider = this.getProvider();
    return provider.createPaymentIntent(params);
  }

  public static async verifyPayment(params: VerifyPaymentParams): Promise<PaymentIntentResult> {
    const provider = this.getProvider();
    return provider.verifyPayment(params);
  }

  public static async refundPayment(params: RefundPaymentParams): Promise<RefundResult> {
    const provider = this.getProvider();
    return provider.refundPayment(params);
  }

  public static async handleWebhook(
    payload: string,
    headers: Record<string, string>
  ): Promise<WebhookValidationResult> {
    const provider = this.getProvider();
    return provider.validateWebhook(payload, headers);
  }
}
