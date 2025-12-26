import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is required for transfer functionality");
}
const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface BankListResponse {
  status: boolean;
  message: string;
  data: Array<{
    name: string;
    slug: string;
    code: string;
    longcode: string;
    gateway: string | null;
    pay_with_bank: boolean;
    active: boolean;
    country: string;
    currency: string;
    type: string;
  }>;
}

interface AccountVerificationResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

interface RecipientResponse {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    is_deleted: boolean;
    details: {
      authorization_code: string | null;
      account_number: string;
      account_name: string | null;
      bank_code: string;
      bank_name: string;
    };
  };
}

interface TransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    recipient: number;
    status: string;
    transfer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface BalanceResponse {
  status: boolean;
  message: string;
  data: Array<{
    currency: string;
    balance: number;
  }>;
}

export async function listBanks(): Promise<BankListResponse> {
  try {
    const response = await axios.get<BankListResponse>(
      `${PAYSTACK_BASE_URL}/bank?country=nigeria`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack list banks error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to fetch banks");
  }
}

export async function verifyAccountNumber(
  accountNumber: string,
  bankCode: string
): Promise<AccountVerificationResponse> {
  try {
    const response = await axios.get<AccountVerificationResponse>(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack account verification error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to verify account");
  }
}

export async function createTransferRecipient(
  accountName: string,
  accountNumber: string,
  bankCode: string
): Promise<RecipientResponse> {
  try {
    const response = await axios.post<RecipientResponse>(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      {
        type: "nuban",
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack create recipient error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to create transfer recipient");
  }
}

export async function initiateTransfer(
  recipientCode: string,
  amount: number,
  reference: string,
  reason: string
): Promise<TransferResponse> {
  try {
    // Convert amount to kobo (Paystack uses kobo)
    const amountInKobo = Math.round(amount * 100);

    const response = await axios.post<TransferResponse>(
      `${PAYSTACK_BASE_URL}/transfer`,
      {
        source: "balance",
        amount: amountInKobo,
        recipient: recipientCode,
        reason,
        reference,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack transfer error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to initiate transfer");
  }
}

export async function getBalance(): Promise<BalanceResponse> {
  try {
    const response = await axios.get<BalanceResponse>(
      `${PAYSTACK_BASE_URL}/balance`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack balance check error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to check balance");
  }
}
