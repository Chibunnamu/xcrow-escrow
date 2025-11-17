import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { type Transaction } from "@shared/schema";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { TransactionAcceptDialog } from "@/components/TransactionAcceptDialog";

export const TransactionDetails = (): JSX.Element => {
  const [, params] = useRoute("/transaction/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);

  const { data: userData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/user"],
  });

  const { data: transactionData, isLoading } = useQuery<{ transaction: Transaction } | null>({
    queryKey: ["/api/transactions/id", params?.id],
    enabled: !!params?.id,
  });

  const transaction = transactionData?.transaction;
  const isBuyer = transaction && (userData?.user?.id === transaction.buyerId || userData?.user?.email === transaction.buyerEmail);
  const isSeller = transaction && userData?.user?.id === transaction.sellerId;

  const acceptTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) throw new Error("No transaction");
      const response = await apiRequest("POST", `/api/transactions/${transaction.id}/accept`);
      return response.json();
    },
    onSuccess: (data) => {
      setAcceptDialogOpen(false);
      // Invalidate and refetch the transaction data to get updated status
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/id", params?.id] });
      toast({
        title: "Transaction accepted",
        description: "Redirecting to payment...",
      });
      // Navigate to payment page after successful acceptance
      setTimeout(() => {
        setLocation(`/payment/${transaction?.id}`);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initializePaymentMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) throw new Error("No transaction");
      const res = await apiRequest("POST", "/api/payments/initialize", { transactionId: transaction.id });
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

  const cancelTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) throw new Error("No transaction");
      const response = await apiRequest("POST", `/api/transactions/${transaction.id}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction cancelled",
        description: "The transaction has been cancelled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsTransferredMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) throw new Error("No transaction");
      const response = await apiRequest("POST", `/api/transactions/${transaction.id}/mark-transferred`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/id", params?.id] });
      toast({
        title: "Asset marked as transferred",
        description: "The buyer can now confirm receipt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProceedToPayment = () => {
    if (!userData?.user) {
      setLocation(`/login?redirect=/transaction/${params?.id}`);
      return;
    }
    if (transaction?.buyerId) {
      // Transaction already accepted, proceed directly to payment
      initializePaymentMutation.mutate();
    } else {
      // Need to accept transaction first
      setAcceptDialogOpen(true);
    }
  };

  const handleAcceptTransaction = () => {
    acceptTransactionMutation.mutate();
  };

  const handleDeclineTransaction = () => {
    setAcceptDialogOpen(false);
    toast({
      title: "Transaction declined",
      description: "You have declined this transaction",
    });
  };

  const handleCancelTransaction = () => {
    cancelTransactionMutation.mutate();
  };

  const handleMarkAsTransferred = () => {
    markAsTransferredMutation.mutate();
  };

  const copyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: "Link copied",
      description: "Transaction link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      paid: "default",
      asset_transferred: "outline",
      completed: "default",
      cancelled: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"} data-testid={`status-${status}`}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

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

  return (
    <div className="w-full min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#041d0f] mb-2">Transaction Details</h1>
          <p className="text-gray-600">Secure escrow transaction</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle data-testid="text-itemName">{transaction.itemName}</CardTitle>
                <p className="text-sm text-gray-600 mt-1" data-testid="text-itemDescription">
                  {transaction.itemDescription}
                </p>
              </div>
              {getStatusBadge(transaction.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600">Buyer Email</p>
                <p className="font-medium" data-testid="text-buyerEmail">{transaction.buyerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transaction Link</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate flex-1">
                    {window.location.href}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyLink}
                    data-testid="button-copy-link"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Item Price</p>
                <p className="font-medium" data-testid="text-price">₦{parseFloat(transaction.price).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Service Fee (5%)</p>
                <p className="font-medium" data-testid="text-commission">₦{parseFloat(transaction.commission).toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold" data-testid="text-total">
                  ₦{(parseFloat(transaction.price) + parseFloat(transaction.commission)).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Transaction Status</h3>
              <p className="text-sm text-blue-800">
                {transaction.status === "pending" && "Waiting for buyer payment"}
                {transaction.status === "paid" && "Payment received. Seller should transfer the asset"}
                {transaction.status === "asset_transferred" && "Asset transferred. Buyer should confirm receipt"}
                {transaction.status === "completed" && "Transaction completed successfully"}
                {transaction.status === "cancelled" && "Transaction has been cancelled"}
              </p>
            </div>

            <div className="flex gap-4">
              {(transaction.status === "pending" || transaction.status === "active") && isBuyer && (
                <>
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={acceptTransactionMutation.isPending || initializePaymentMutation.isPending}
                    data-testid="button-proceed-payment"
                    className="bg-[#493d9e] hover:bg-[#493d9e]/90"
                  >
                    {acceptTransactionMutation.isPending || initializePaymentMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {acceptTransactionMutation.isPending ? "Accepting..." : "Initializing Payment..."}
                      </>
                    ) : (
                      transaction.buyerId ? "Proceed to Payment" : "Accept & Pay"
                    )}
                  </Button>
                  <Button
                    onClick={handleCancelTransaction}
                    disabled={cancelTransactionMutation.isPending}
                    variant="outline"
                    data-testid="button-cancel-transaction"
                    className="border-red-500 text-red-500 hover:bg-red-50"
                  >
                    {cancelTransactionMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Cancel Transaction"
                    )}
                  </Button>
                </>
              )}

              {isBuyer && transaction.status === "asset_transferred" && (
                <Button
                  onClick={() => setLocation(`/buyer-confirm/${transaction.id}`)}
                  data-testid="button-confirm-receipt"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm Receipt
                </Button>
              )}

              {isSeller && transaction.status === "paid" && (
                <Button
                  onClick={handleMarkAsTransferred}
                  disabled={markAsTransferredMutation.isPending}
                  data-testid="button-mark-transferred"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {markAsTransferredMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Marking...
                    </>
                  ) : (
                    "Mark as Transferred"
                  )}
                </Button>
              )}

              {isSeller && (
                <Button
                  variant="outline"
                  onClick={() => setLocation("/seller-dashboard")}
                  data-testid="button-dashboard"
                >
                  Back to Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <TransactionAcceptDialog
          open={acceptDialogOpen}
          onOpenChange={setAcceptDialogOpen}
          transaction={transaction}
          sellerName={`${userData?.user?.firstName || ''} ${userData?.user?.lastName || ''}`.trim()}
          onAccept={handleAcceptTransaction}
          onDecline={handleDeclineTransaction}
        />
      </div>
    </div>
  );
};
