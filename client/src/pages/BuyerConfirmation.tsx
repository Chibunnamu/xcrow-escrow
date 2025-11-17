import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Transaction } from "@shared/schema";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const BuyerConfirmation = (): JSX.Element => {
  const [, params] = useRoute("/buyer-confirm/:id");
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
  const isBuyer = transaction && userData?.user?.email === transaction.buyerEmail;

  const confirmReceiptMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await apiRequest("PATCH", `/api/transactions/${transactionId}/status`, { status: "completed" });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction completed",
        description: "Funds have been released to the seller",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/id", transaction?.id] });
      setLocation(`/transaction/${transaction?.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Confirmation failed",
        description: error.message || "Unable to confirm receipt",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!transaction || !isBuyer) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <p>Transaction not found or you don't have permission</p>
      </div>
    );
  }

  if (transaction.status !== "asset_transferred") {
    setLocation(`/transaction/${transaction.id}`);
    return <></>;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#041d0f] mb-2">Confirm Receipt</h1>
          <p className="text-gray-600">Verify that you received the item</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
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
                  <span className="text-gray-600">Service Fee</span>
                  <span className="font-medium" data-testid="text-commission">
                    ₦{parseFloat(transaction.commission).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total Paid</span>
                  <span className="text-xl font-bold" data-testid="text-total">
                    ₦{(parseFloat(transaction.price) + parseFloat(transaction.commission)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Important Notice</h3>
                  <p className="text-sm text-yellow-800">
                    By confirming receipt, you acknowledge that you have received the item as described.
                    The payment will be released to the seller and this action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Ready to Confirm?</h3>
                  <p className="text-sm text-green-800">
                    Only confirm if you have received the item and are satisfied with it.
                  </p>
                </div>
              </div>
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
                onClick={() => confirmReceiptMutation.mutate(transaction.id)}
                disabled={confirmReceiptMutation.isPending}
                data-testid="button-confirm"
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {confirmReceiptMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Receipt & Release Funds
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
