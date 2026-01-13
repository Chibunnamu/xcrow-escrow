import axios from "axios";
import { createHmac } from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
}

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export const FEE_CONFIG = {
  xcrowpayRate: 0.05, // 5% Xcrowpay service fee
  paystackCollectionRate: 0.015, // 1.5% Paystack collection fee
  paystackCollectionCap: 100000, // ₦1,000 cap in kobo
  paystackPayoutThreshold: 5000000, // ₦50,000 threshold in kobo
  paystackPayoutFeeLow: 2500, // ₦25 for payouts ≤ ₦50,000 in kobo
  paystackPayoutFeeHigh: 5000, // ₦50 for payouts > ₦50,000 in kobo
};

export function calculateXcrowFee(baseAmount: number): number {
  // Xcrow platform fee: 5% of base transaction amount
  return Math.round(baseAmount * FEE_CONFIG.xcrowpayRate);
}

export function calculatePaystackCollectionFee(baseAmount: number): number {
  // Paystack collection fee: 1.5% of base amount, capped at ₦1,000
  return Math.min(
    Math.round(baseAmount * FEE_CONFIG.paystackCollectionRate),
    FEE_CONFIG.paystackCollectionCap
  );
}

export function calculateTransferFee(baseAmount: number): number {
  // Paystack transfer (payout) fee: ₦25 for ≤ ₦50,000, ₦50 for > ₦50,000
  return baseAmount <= FEE_CONFIG.paystackPayoutThreshold
    ? FEE_CONFIG.paystackPayoutFeeLow
    : FEE_CONFIG.paystackPayoutFeeHigh;
}



export interface InitializePaymentParams {
  email: string;
  amount: number;
  reference: string;
  metadata?: {
    transactionId: string;
    itemName: string;
  };
  subaccount?: string;
  transaction_charge?: number;
  bearer?: string;
}

export interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    metadata: {
      transactionId?: string;
      itemName?: string;
    };
    customer: {
      email: string;
    };
  };
}

export async function initializePayment(
  params: InitializePaymentParams
): Promise<InitializePaymentResponse> {
  try {
    // Amount should already be in kobo when passed to this function
    const requestBody: any = {
      email: params.email,
      amount: params.amount, // Amount already in kobo
      reference: params.reference,
      metadata: params.metadata,
      callback_url: `${process.env.VITE_API_URL}/payment-callback`,
    };

    // Add split payment parameters if provided
    if (params.subaccount) {
      requestBody.subaccount = params.subaccount;
    }
    if (params.transaction_charge !== undefined) {
      requestBody.transaction_charge = params.transaction_charge;
    }
    if (params.bearer) {
      requestBody.bearer = params.bearer;
    }

    const response = await paystackClient.post<InitializePaymentResponse>(
      "/transaction/initialize",
      requestBody
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack initialize payment error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to initialize payment"
    );
  }
}



export async function verifyPayment(
  reference: string
): Promise<VerifyPaymentResponse> {
  try {
    const response = await paystackClient.get<VerifyPaymentResponse>(
      `/transaction/verify/${reference}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack verify payment error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to verify payment"
    );
  }
}

export function validatePaystackWebhook(
  signature: string,
  body: string
): boolean {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is required for webhook validation");
  }

  const hash = createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");
  return hash === signature;
}


