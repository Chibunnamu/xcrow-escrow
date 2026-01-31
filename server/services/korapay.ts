import axios from "axios";
import { createHmac } from "crypto";

const KORAPAY_BASE_URL = process.env.KORAPAY_BASE_URL || "https://api.korapay.com";
const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY;
const KORAPAY_PUBLIC_KEY = process.env.KORAPAY_PUBLIC_KEY;
const KORAPAY_WEBHOOK_SECRET = process.env.KORAPAY_WEBHOOK_SECRET;

const korapayClient = axios.create({
  baseURL: KORAPAY_BASE_URL,
  headers: {
    Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export interface Bank {
  id: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface BanksResponse {
  status: boolean;
  message: string;
  data: Bank[];
}

export interface ResolveAccountResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
  };
}

export interface InitiatePayoutParams {
  amount: number;
  bankCode: string;
  accountNumber: string;
  name: string;
  reference: string;
}

export interface InitiatePayoutResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    fee: number;
  };
}

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

/**
 * Get list of supported banks
 */
export async function listBanks(countryCode = "NG"): Promise<BanksResponse> {
  try {
    const response = await korapayClient.get<BanksResponse>(
      `/merchant/api/v1/misc/banks?countryCode=${countryCode}`
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
 * Resolve bank account details
 */
export async function resolveAccount(
  bankCode: string,
  accountNumber: string
): Promise<ResolveAccountResponse> {
  try {
    const response = await korapayClient.post<ResolveAccountResponse>(
      "/merchant/api/v1/misc/banks/resolve",
      {
        bank_code: bankCode,
        account_number: accountNumber,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Korapay resolve account error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to resolve account"
    );
  }
}

/**
 * Initiate payout to seller
 */
export async function initiatePayout(
  params: InitiatePayoutParams
): Promise<InitiatePayoutResponse> {
  try {
    const response = await korapayClient.post<InitiatePayoutResponse>(
      "/merchant/api/v1/transfers/disburse",
      {
        reference: params.reference,
        amount: params.amount,
        currency: "NGN",
        destination: {
          type: "bank_account",
          amount: params.amount,
          currency: "NGN",
          bank_account: {
            bank: params.bankCode,
            account: params.accountNumber,
          },
          customer: {
            name: params.name,
          },
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Korapay initiate payout error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to initiate payout"
    );
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhook(signature: string, rawBody: string): boolean {
  if (!KORAPAY_WEBHOOK_SECRET) {
    throw new Error("KORAPAY_WEBHOOK_SECRET environment variable is required");
  }

  const expectedSignature = createHmac("sha256", KORAPAY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");

  return signature === expectedSignature;
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
