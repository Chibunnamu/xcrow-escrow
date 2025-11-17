import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { type Transaction } from "@shared/schema";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export const PaymentPage = (): JSX.Element => {
  const [, params] = useRoute("/payment/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/user"],
  });

  const { data: transactionData, isLoading } = useQuery<{ transaction: Transaction } | null>({
    queryKey: ["/api/transactions/id", params?.id],
    enabled: !!params?.id,
  });

  const transaction = transactionData?.transaction;

  const initializePaymentMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await apiRequest("POST", "/api/payments/initialize", { transactionId: transactionId });
      return await res.json();
    },
    onSuccess: (data: { authorization_url: string; reference: string }) => {
      window.location.href = data.authorization_url;
    },
    onError: (error: any) => {
      toast({
        title: "Payment initialization failed",
        description: error.message || "Unable to start payment",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (transaction) {
      // Check if transaction is not payable (already paid, completed, or cancelled)
      const nonPayableStatuses = ["paid", "asset_transferred", "completed", "cancelled"];
      if (nonPayableStatuses.includes(transaction.status)) {
        toast({
          title: "Payment already completed",
          description: "This transaction has already been paid",
        });
        setLocation(`/transaction/${transaction.id}`);
        return;
      }

      // Check if transaction is not in the correct status for payment (should be "active" after acceptance)
      if (transaction.status !== "active") {
        toast({
          title: "Transaction not ready for payment",
          description: "This transaction is not in the correct state for payment",
        });
        setLocation(`/transaction/${transaction.id}`);
        return;
      }

      // Check if transaction is not accepted yet
      if (!transaction.buyerId) {
        toast({
          title: "Transaction not accepted",
          description: "You must accept the transaction before making payment",
        });
        setLocation(`/transaction/${transaction.id}`);
        return;
      }

      // Check if user is not the buyer
      if (userData?.user?.id !== transaction.buyerId) {
        toast({
          title: "Unauthorized",
          description: "You are not authorized to pay for this transaction",
        });
        setLocation(`/transaction/${transaction.id}`);
        return;
      }
    }
  }, [transaction, userData]);

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

  const totalAmount = parseFloat(transaction.price) + parseFloat(transaction.commission);

  return (
    <div className="w-full min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#041d0f] mb-2">Complete Payment</h1>
          <p className="text-gray-600">You're about to pay for this transaction</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">{transaction.itemName}</h3>
              <p className="text-sm text-gray-600">{transaction.itemDescription}</p>
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
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold" data-testid="text-total">
                    ₦{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Secure Payment</h3>
              <p className="text-sm text-blue-800">
                Your payment will be held in escrow until you confirm receipt of the item. The seller
                will only receive the funds after you confirm.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setLocation(`/transaction/${transaction.id}`)}
                data-testid="button-cancel"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => initializePaymentMutation.mutate(transaction.id)}
                disabled={initializePaymentMutation.isPending}
                data-testid="button-proceed"
                className="flex-1 bg-[#493d9e] hover:bg-[#493d9e]/90"
              >
                {initializePaymentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
