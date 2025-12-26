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
  commissionPool: number;
  sellerPayout: number;
  paystackTransactionFee: number;
  paystackTransferFee: number;
  companyCommission: number;
  totalChargeAmount: number;
}

export function calculatePaystackCharge(baseAmount: number): PaystackChargeBreakdown {
  if (baseAmount <= 0) {
    throw new Error("Invalid base amount: must be greater than 0");
  }

  // Seller receives exactly the baseAmount with no deductions
  const sellerPayout = baseAmount;

  // Company commission is 10% of baseAmount
  const companyCommission = baseAmount * 0.10;

  // Paystack transaction fee on the full amount (base + commission)
  const fullAmount = baseAmount + companyCommission;
  const paystackTransactionFee = Math.min(fullAmount * 0.015 + 100, 2000); // 1.5% + ₦100, capped at ₦2000

  // Paystack transfer fee on seller's payout amount
  const paystackTransferFee = Math.min(sellerPayout * 0.015 + 10, 50); // 1.5% + ₦10, capped at ₦50

  // Total amount buyer pays = baseAmount + company commission + all Paystack fees
  const totalChargeAmount = baseAmount + companyCommission + paystackTransactionFee + paystackTransferFee;

  return {
    baseAmount,
    commissionPool: companyCommission, // Updated to match new commission calculation
    sellerPayout,
    paystackTransactionFee,
    paystackTransferFee,
    companyCommission,
    totalChargeAmount,
  };
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


