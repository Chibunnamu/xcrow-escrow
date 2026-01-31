import axios from "axios";
import { createHmac } from "crypto";

const KORAPAY_BASE_URL = "https://api.korapay.com";

const KORAPAY_PUBLIC_KEY = process.env.KORAPAY_PUBLIC_KEY;
const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY;
const KORAPAY_WEBHOOK_SECRET = process.env.KORAPAY_WEBHOOK_SECRET;

if (!KORAPAY_SECRET_KEY) {
  throw new Error("KORAPAY_SECRET_KEY environment variable is required");
}

if (!KORAPAY_WEBHOOK_SECRET) {
  throw new Error("KORAPAY_WEBHOOK_SECRET environment variable is required");
}

const korapayClient = axios.create({
  baseURL: KORAPAY_BASE_URL,
  headers: {
    Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export interface InitializePaymentParams {
  amount: number;
  currency: string;
  reference: string;
  customer: {
    email: string;
    name?: string;
  };
  notification_url?: string;
  redirect_url?: string;
  metadata?: {
    transactionId: string;
    itemName: string;
  };
}

export interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    checkout_url: string;
    reference: string;
    amount: number;
    currency: string;
  };
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
      name?: string;
    };
    metadata?: {
      transactionId?: string;
      itemName?: string;
    };
  };
}

export interface TransferParams {
  amount: number;
  currency: string;
  reference: string;
  destination: {
    type: string;
    amount: number;
    currency: string;
    bank_account: {
      bank: string;
      account: string;
    };
    customer: {
      email: string;
      name?: string;
    };
  };
  metadata?: {
    transactionId: string;
  };
}

export interface TransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    fee: number;
  };
}

export interface Bank {
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface BanksResponse {
  status: boolean;
  message: string;
  data: Bank[];
}

export interface AccountVerificationParams {
  account_number: string;
  bank_code: string;
}

export interface AccountVerificationResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_code: string;
  };
}

export interface WebhookEvent {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    customer?: {
      email: string;
      name?: string;
    };
    metadata?: {
      transactionId?: string;
      itemName?: string;
    };
  };
}

/**
 * Initialize a payment using Korapay Collections API
 */
export async function initializePayment(
  params: InitializePaymentParams
): Promise<InitializePaymentResponse> {
  try {
    const requestBody = {
      amount: params.amount,
      currency: params.currency || "NGN",
      reference: params.reference,
      customer: params.customer,
      notification_url: params.notification_url,
      redirect_url: params.redirect_url,
      metadata: params.metadata,
    };

    const response = await korapayClient.post<InitializePaymentResponse>(
      "/merchant/api/v1/charges/initialize",
      requestBody
    );

    return response.data;
  } catch (error: any) {
    console.error("Korapay initialize payment error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to initialize payment"
    );
  }
}

/**
 * Verify payment status
 */
export async function verifyPayment(
  reference: string
): Promise<VerifyPaymentResponse> {
  try {
    const response = await korapayClient.get<VerifyPaymentResponse>(
      `/merchant/api/v1/charges/${reference}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Korapay verify payment error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to verify payment"
    );
  }
}

/**
 * Transfer funds to seller using Korapay Transfers/Disbursement API
 */
export async function transferToSeller(
  params: TransferParams
): Promise<TransferResponse> {
  try {
    const response = await korapayClient.post<TransferResponse>(
      "/merchant/api/v1/transfers",
      params
    );

    return response.data;
  } catch (error: any) {
    console.error("Korapay transfer error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to initiate transfer"
    );
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhook(
  signature: string,
  body: string
): boolean {
  if (!KORAPAY_WEBHOOK_SECRET) {
    throw new Error("KORAPAY_WEBHOOK_SECRET environment variable is required for webhook validation");
  }

  const expectedSignature = createHmac("sha256", KORAPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return signature === expectedSignature;
}

/**
 * Get Korapay fee configuration
 * Note: Korapay fees vary, this is a simplified version
 */
export function calculateKorapayFee(amount: number): number {
  // Korapay collection fee is typically 1.5% with caps
  // This is approximate - check official docs for exact rates
  const fee = Math.min(amount * 0.015, 2000); // Cap at ₦20
  return Math.round(fee);
}

/**
 * Calculate net amount after Korapay fees
 * For payouts, we need to ensure seller gets full baseAmount
 */
export function calculateNetPayoutAmount(baseAmount: number): number {
  // For immediate payouts, we send the full baseAmount to seller
  // Korapay transfer fees are deducted from platform's service fee
  return baseAmount;
}

/**
 * Get list of supported banks from Korapay
 */
export async function listBanks(): Promise<BanksResponse> {
  try {
    const response = await korapayClient.get<BanksResponse>(
      "/merchant/api/v1/misc/banks"
    );
    return response.data;
  } catch (error: any) {
    console.error("Korapay list banks error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to fetch banks list"
    );
  }
}

/**
 * Verify bank account details using Korapay
 */
export async function verifyAccountNumber(
  accountNumber: string,
  bankCode: string
): Promise<AccountVerificationResponse> {
  try {
    const response = await korapayClient.get<AccountVerificationResponse>(
      `/merchant/api/v1/misc/banks/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Korapay account verification error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to verify account"
    );
  }
}
