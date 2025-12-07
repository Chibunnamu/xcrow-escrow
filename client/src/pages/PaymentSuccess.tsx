import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { type Transaction } from "@shared/schema";
import { Loader2, CheckCircle2, ArrowRight, Download, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const PaymentSuccess = (): JSX.Element => {
  const [, params] = useRoute("/payment-success/:reference");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);

  // First, verify the payment to get transaction details
  const { data: paymentData, isLoading: isPaymentLoading } = useQuery<any>({
    queryKey: ["/api/payments/verify", params?.reference],
    enabled: !!params?.reference,
  });

  const transactionId = paymentData?.data?.metadata?.transactionId;

  const { data: transactionData, isLoading: isTransactionLoading } = useQuery<{ transaction: Transaction } | null>({
    queryKey: ["/api/transactions/id", transactionId],
    enabled: !!transactionId,
  });

  const transaction = transactionData?.transaction;
  const paymentStatus = paymentData?.data?.status || (transaction?.status === "paid" ? "success" : "failed");

  const isLoading = isPaymentLoading || isTransactionLoading;

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <p>Transaction not found</p>
      </div>
    );
  }

  const generateReceipt = async () => {
    setIsGeneratingReceipt(true);
    try {
      // Create receipt content
      const receiptData = {
        transactionId: transaction.id,
        itemName: transaction.itemName,
        itemDescription: transaction.itemDescription,
        buyerEmail: transaction.buyerEmail,
        sellerId: transaction.sellerId,
        price: parseFloat(transaction.price),
        commission: parseFloat(transaction.commission),
        total: parseFloat(transaction.price) + parseFloat(transaction.commission),
        paymentStatus: paymentStatus,
        paymentReference: params?.reference,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      };

      // Generate PDF receipt
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text('Escrow Payment Receipt', 105, 20, { align: 'center' });

      // Company info
      doc.setFontSize(12);
      doc.text('Secure Escrow Transaction Service', 105, 35, { align: 'center' });

      // Transaction details
      doc.setFontSize(14);
      doc.text('Transaction Details', 20, 55);

      doc.setFontSize(10);
      doc.text(`Transaction ID: ${receiptData.transactionId}`, 20, 70);
      doc.text(`Item: ${receiptData.itemName}`, 20, 80);
      doc.text(`Description: ${receiptData.itemDescription}`, 20, 90);
      doc.text(`Buyer: ${receiptData.buyerEmail}`, 20, 100);
      doc.text(`Date: ${receiptData.date} ${receiptData.time}`, 20, 110);

      // Payment details
      doc.setFontSize(14);
      doc.text('Payment Details', 20, 130);

      doc.setFontSize(10);
      doc.text(`Item Price: ₦${receiptData.price.toLocaleString()}`, 20, 145);
      doc.text(`Service Fee (5%): ₦${receiptData.commission.toLocaleString()}`, 20, 155);
      doc.text(`Total Paid: ₦${receiptData.total.toLocaleString()}`, 20, 165);
      doc.text(`Payment Status: ${receiptData.paymentStatus === 'success' ? 'PAID' : 'FAILED'}`, 20, 175);
      doc.text(`Reference: ${receiptData.paymentReference}`, 20, 185);

      // Footer
      doc.setFontSize(8);
      doc.text('Thank you for using our escrow service. Your payment is securely held until transaction completion.', 105, 270, { align: 'center' });

      // Download the PDF
      doc.save(`receipt-${receiptData.transactionId}.pdf`);

      toast({
        title: "Receipt Downloaded",
        description: "Your payment receipt has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate receipt",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const isSuccess = paymentStatus === "success";

  return (
    <div className="w-full min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
            {isSuccess ? (
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-[#041d0f] mb-2">
            {isSuccess ? "Payment Successful!" : "Payment Failed"}
          </h1>
          <p className="text-gray-600">
            {isSuccess
              ? "Your payment has been processed and is now in escrow"
              : "Your payment could not be processed. Please try again."
            }
          </p>
          <div className="mt-4">
            <Badge variant={isSuccess ? "default" : "destructive"} className="text-sm">
              {isSuccess ? "PAID" : "FAILED"}
            </Badge>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2" data-testid="text-itemName">{transaction.itemName}</h3>
              <p className="text-sm text-gray-600" data-testid="text-itemDescription">
                {transaction.itemDescription}
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item Price</span>
                  <span className="font-medium" data-testid="text-price">
                    ₦{parseFloat(transaction.price).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee (5%)</span>
                  <span className="font-medium" data-testid="text-commission">
                    ₦{parseFloat(transaction.commission).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total Paid</span>
                  <span className="text-2xl font-bold text-green-600" data-testid="text-total">
                    ₦{(parseFloat(transaction.price) + parseFloat(transaction.commission)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">What's Next?</h3>
              <div className="text-sm text-green-800 space-y-2">
                <p>✅ <strong>Payment Confirmed:</strong> Your funds are securely held in escrow</p>
                <p>⏳ <strong>Waiting for Seller:</strong> The seller will now deliver the item</p>
                <p>🔍 <strong>Review & Confirm:</strong> Once you receive the item, confirm receipt to release funds</p>
                <p>💰 <strong>Funds Released:</strong> Money goes to seller only after your confirmation</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Transaction Status</h3>
              <p className="text-sm text-blue-800">
                Current status: <span className="font-medium">Payment Received</span>
                <br />
                You will be notified when the seller marks the item as delivered.
              </p>
            </div>

            <div className="flex gap-4">
              {isSuccess && (
                <Button
                  onClick={generateReceipt}
                  disabled={isGeneratingReceipt}
                  variant="outline"
                  className="flex-1"
                >
                  {isGeneratingReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Receipt
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() => setLocation("/seller-dashboard")}
                className="flex-1 bg-[#493d9e] hover:bg-[#493d9e]/90"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Click the "Go to Dashboard" button to continue</p>
        </div>
      </div>
    </div>
  );
};
