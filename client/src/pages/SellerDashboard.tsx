import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Transaction } from "@shared/schema";
import { Loader2 } from "lucide-react";

export const SellerDashboard = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/user"],
  });

  const { data: transactionsData, isLoading } = useQuery<{ transactions: Transaction[] } | null>({
    queryKey: ["/api/transactions/seller", userData?.user?.id],
    enabled: !!userData?.user?.id,
  });

  const markAsTransferredMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await apiRequest("PATCH", `/api/transactions/${transactionId}/status`, { status: "asset_transferred" });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Transaction marked as asset transferred",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/seller"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  if (!userData) {
    setLocation("/login");
    return <></>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      paid: "default",
      asset_transferred: "outline",
      completed: "default",
    };
    return (
      <Badge variant={variants[status] || "default"} data-testid={`status-${status}`}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#041d0f] mb-2">Seller Dashboard</h1>
            <p className="text-gray-600">Manage your transactions</p>
          </div>
          <Button
            onClick={() => setLocation("/create-transaction")}
            data-testid="button-create-transaction"
            className="bg-[#493d9e] hover:bg-[#493d9e]/90"
          >
            Create Transaction
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : transactionsData?.transactions?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No transactions yet. Create your first transaction to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactionsData?.transactions?.map((transaction: Transaction) => (
              <Card key={transaction.id} data-testid={`card-transaction-${transaction.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{transaction.itemName}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{transaction.itemDescription}</p>
                    </div>
                    {getStatusBadge(transaction.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Buyer Email</p>
                      <p className="font-medium" data-testid={`text-buyerEmail-${transaction.id}`}>
                        {transaction.buyerEmail}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="font-medium" data-testid={`text-price-${transaction.id}`}>
                        ₦{parseFloat(transaction.price).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Commission</p>
                      <p className="font-medium" data-testid={`text-commission-${transaction.id}`}>
                        ₦{parseFloat(transaction.commission).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="font-medium" data-testid={`text-total-${transaction.id}`}>
                        ₦{(parseFloat(transaction.price) + parseFloat(transaction.commission)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/transaction/${transaction.uniqueLink}`)}
                      data-testid={`button-view-${transaction.id}`}
                    >
                      View Details
                    </Button>
                    {transaction.status === "paid" && (
                      <Button
                        onClick={() => markAsTransferredMutation.mutate(transaction.id)}
                        data-testid={`button-transfer-${transaction.id}`}
                        disabled={markAsTransferredMutation.isPending}
                        className="bg-[#493d9e] hover:bg-[#493d9e]/90"
                      >
                        Mark as Transferred
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
