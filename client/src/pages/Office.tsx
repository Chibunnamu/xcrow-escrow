import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Eye, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Office() {
  const [ongoingSearch, setOngoingSearch] = useState("");
  const [ongoingStatus, setOngoingStatus] = useState("all");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch ongoing transactions
  const { data: ongoingData, isLoading: ongoingLoading } = useQuery({
    queryKey: ["/api/office/ongoing-transactions", { status: ongoingStatus, search: ongoingSearch }],
  });

  // Mark asset as transferred mutation
  const markAsTransferredMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/transactions/${transactionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "asset_transferred" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/ongoing-transactions"] });
      toast({
        title: "Success",
        description: "Transaction marked as asset transferred",
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
      pending: { variant: "secondary", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
      paid: { variant: "default", color: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
      asset_transferred: { variant: "outline", color: "bg-green-100 text-green-800 hover:bg-green-100" },
    };
    const config = variants[status] || { variant: "secondary" as const, color: "" };
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Office</h1>
          <p className="text-gray-600 mt-2">Manage your transactions and disputes</p>
        </div>

        <Tabs defaultValue="ongoing" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="ongoing">Ongoing Transactions</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing">
            <Card>
              <CardHeader>
                <CardTitle>Ongoing Transactions</CardTitle>
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by buyer email, item name, or transaction ID..."
                      value={ongoingSearch}
                      onChange={(e) => setOngoingSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={ongoingStatus} onValueChange={setOngoingStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="asset_transferred">Asset Transferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {ongoingLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : !(ongoingData as any)?.transactions || (ongoingData as any).transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No ongoing transactions found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Buyer Email</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ongoingData as any).transactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.itemName}</TableCell>
                          <TableCell>{transaction.buyerEmail}</TableCell>
                          <TableCell>₦{parseFloat(transaction.price).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/transaction/${transaction.uniqueLink}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {transaction.status === "paid" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => markAsTransferredMutation.mutate(transaction.id)}
                                  disabled={markAsTransferredMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Mark Transferred
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes">
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-600">Disputes will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-600">Transaction history will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
