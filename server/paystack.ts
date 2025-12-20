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

export interface PaystackChargeBreakdown {
  baseAmount: number;
  platformFee: number;
  subtotal: number;
  paystackFee: number;
  totalChargeAmount: number;
}

export function calculatePaystackCharge(baseAmount: number): PaystackChargeBreakdown {
  if (baseAmount <= 0) {
    throw new Error("Invalid base amount: must be greater than 0");
  }

  const platformFee = baseAmount * 0.05; // 5% platform fee
  const subtotal = baseAmount + platformFee;
  const paystackFee = Math.min(subtotal * 0.015 + 100, 2000); // 1.5% + ₦100, capped at ₦2000
  const totalChargeAmount = subtotal + paystackFee;

  return {
    baseAmount,
    platformFee,
    subtotal,
    paystackFee,
    totalChargeAmount,
  };
}

export interface CreateSubaccountParams {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  description?: string;
}

export interface CreateSubaccountResponse {
  status: boolean;
  message: string;
  data: {
    integration: number;
    domain: string;
    subaccount_code: string;
    business_name: string;
    description: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    primary_contact_phone: string | null;
    metadata: any;
    percentage_charge: number;
    is_verified: boolean;
    settlement_bank: string;
    account_number: string;
    active: boolean;
    migrate: boolean;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface InitializePaymentParams {
  email: string;
  amount: number;
  reference: string;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: string;
  metadata?: {
    transactionId: string;
    itemName: string;
  };
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

export async function createSubaccount(
  params: CreateSubaccountParams
): Promise<CreateSubaccountResponse> {
  try {
    const response = await paystackClient.post<CreateSubaccountResponse>(
      "/subaccount",
      params
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack create subaccount error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to create subaccount"
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

export interface PaystackChargeBreakdown {
  baseAmount: number;
  platformFee: number;
  subtotal: number;
  paystackFee: number;
  totalChargeAmount: number;
}

export function calculatePaystackCharge(baseAmount: number): PaystackChargeBreakdown {
  if (baseAmount <= 0 || isNaN(baseAmount)) {
    throw new Error("Invalid baseAmount: must be a positive number");
  }

  const platformFee = baseAmount * 0.05;
  const subtotal = baseAmount + platformFee;
  const paystackFee = Math.min(subtotal * 0.015 + 100, 2000);
  const totalChargeAmount = subtotal + paystackFee;

  return {
    baseAmount,
    platformFee,
    subtotal,
    paystackFee,
    totalChargeAmount,
  };
}
