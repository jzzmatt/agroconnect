import type { PaymentStatus, PaymentMethod } from "@/types/database";

export interface CreatePaymentIntentParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntentResult {
  success: boolean;
  provider: string;
  providerPaymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  checkoutUrl?: string;
  qrCodeUrl?: string;
  instructions?: string;
  error?: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  providerPaymentId: string;
}

export interface RefundPaymentParams {
  orderId: string;
  providerPaymentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  status: "refunded" | "partially_refunded" | "failed";
  refundId?: string;
  amountRefunded?: number;
  error?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  provider: string;
  eventId: string;
  eventType: string;
  orderId?: string;
  providerPaymentId?: string;
  status?: PaymentStatus;
  amount?: number;
  currency?: string;
  error?: string;
}

/**
 * Standard Payment Provider Contract
 * All gateways (Multicaixa Express/GPO, Unitel Money, Stripe, Sandbox) must conform to this interface.
 */
export interface IPaymentProvider {
  readonly id: string;
  readonly name: string;
  readonly isSandbox: boolean;

  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentIntentResult>;
  cancelPayment(params: VerifyPaymentParams): Promise<boolean>;
  refundPayment(params: RefundPaymentParams): Promise<RefundResult>;
  validateWebhook(payload: string, headers: Record<string, string>): Promise<WebhookValidationResult>;
}
