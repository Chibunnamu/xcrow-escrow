import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Eye, CheckCircle, AlertTriangle, Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { firestoreTimestampToDate } from "../utils/firestoreTimestampToDate";
import { formatFirestoreDate } from "../utils/formatFirestoreDate";

export default function Office() {
  const [ongoingSearch, setOngoingSearch] = useState("");
  const [ongoingStatus, setOngoingStatus] = useState("all");
  const [disputeStatus, setDisputeStatus] = useState("all");
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    transactionId: "",
    reason: "",
    description: "",
    evidence: "",
  });
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyMinAmount, setHistoryMinAmount] = useState("");
  const [historyMaxAmount, setHistoryMaxAmount] = useState("");
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch ongoing transactions with enhanced filtering
  const { data: ongoingData, isLoading: ongoingLoading } = useQuery({
    queryKey: ["/api/office/ongoing-transactions", ongoingStatus, ongoingSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        sortBy: "createdAt",
        sortOrder: "desc",
        page: "1",
        limit: "50"
      });

      if (ongoingStatus !== "all") {
        params.append("status", ongoingStatus);
      }
      if (ongoingSearch) {
        params.append("search", ongoingSearch);
      }

      const response = await fetch(`/api/office/ongoing-transactions?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch ongoing transactions");
      }
      return response.json();
    },
  });

  // Fetch disputes
  const { data: disputesData, isLoading: disputesLoading } = useQuery({
    queryKey: ["/api/disputes", disputeStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (disputeStatus !== "all") {
        params.append("status", disputeStatus);
      }

      const response = await fetch(`/api/disputes?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch disputes");
      }
      return response.json();
    },
  });

  // Fetch transaction history with enhanced filtering
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/office/transaction-history", historySearch, historyDateFrom, historyDateTo, historyMinAmount, historyMaxAmount],
    queryFn: async () => {
      const params = new URLSearchParams({
        sortBy: "completedAt",
        sortOrder: "desc",
        page: "1",
        limit: "50"
      });

      if (historySearch) {
        params.append("search", historySearch);
      }
      if (historyDateFrom) {
        params.append("dateFrom", historyDateFrom);
      }
      if (historyDateTo) {
        params.append("dateTo", historyDateTo);
      }
      if (historyMinAmount) {
        params.append("minAmount", historyMinAmount);
      }
      if (historyMaxAmount) {
        params.append("maxAmount", historyMaxAmount);
      }

      const response = await fetch(`/api/office/transaction-history?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transaction history");
      }
      return response.json();
    },
  });

  // Fetch office statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/office/stats"],
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

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: async (data: typeof disputeForm) => {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create dispute");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
      setDisputeDialogOpen(false);
      setDisputeForm({ transactionId: "", reason: "", description: "", evidence: "" });
      toast({
        title: "Success",
        description: "Dispute created successfully",
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

  const exportToCSV = (transactions: any[]) => {
    const headers = ["Item Name", "Buyer Email", "Amount (₦)", "Commission (₦)", "Status", "Created Date"];
    const rows = transactions.map(t => [
      t.itemName,
      t.buyerEmail,
      parseFloat(t.price).toFixed(2),
      parseFloat(t.commission).toFixed(2),
      t.status,
      firestoreTimestampToDate(t.createdAt)?.toLocaleDateString() || "Invalid Date",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transaction-history-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Office</h1>
          <p className="text-gray-600 mt-2">Manage your transactions and disputes</p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (statsData as any)?.overview?.totalTransactions || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? "..." : (statsData as any)?.overview?.completedTransactions || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? "..." : (statsData as any)?.overview?.ongoingTransactions || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ₦{statsLoading ? "..." : ((statsData as any)?.overview?.totalRevenue || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
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
                          <TableCell>{formatFirestoreDate(transaction.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/transaction/${transaction.id}`)}
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
              <CardHeader>
                <CardTitle>Disputes</CardTitle>
                <div className="flex gap-4 mt-4 items-center justify-between">
                  <Select value={disputeStatus} onValueChange={setDisputeStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Open Dispute
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Open a Dispute</DialogTitle>
                        <DialogDescription>
                          Create a dispute for a transaction. Provide all relevant details.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="transactionId">Transaction ID</Label>
                          <Input
                            id="transactionId"
                            value={disputeForm.transactionId}
                            onChange={(e) => setDisputeForm({ ...disputeForm, transactionId: e.target.value })}
                            placeholder="Enter transaction ID"
                          />
                        </div>
                        <div>
                          <Label htmlFor="reason">Reason</Label>
                          <Input
                            id="reason"
                            value={disputeForm.reason}
                            onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                            placeholder="e.g., Product not delivered"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={disputeForm.description}
                            onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                            placeholder="Provide detailed description of the issue"
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="evidence">Evidence (Optional)</Label>
                          <Textarea
                            id="evidence"
                            value={disputeForm.evidence}
                            onChange={(e) => setDisputeForm({ ...disputeForm, evidence: e.target.value })}
                            placeholder="Links to screenshots, emails, or other evidence"
                            rows={2}
                          />
                        </div>
                        <Button
                          onClick={() => createDisputeMutation.mutate(disputeForm)}
                          disabled={createDisputeMutation.isPending || !disputeForm.transactionId || !disputeForm.reason || !disputeForm.description}
                          className="w-full"
                        >
                          {createDisputeMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Dispute"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {disputesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : !(disputesData as any)?.disputes || (disputesData as any).disputes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No disputes found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(disputesData as any).disputes.map((dispute: any) => (
                        <TableRow key={dispute.id}>
                          <TableCell className="font-medium">{dispute.transactionId.slice(0, 8)}...</TableCell>
                          <TableCell>{dispute.reason}</TableCell>
                          <TableCell>
                            <Badge variant={dispute.status === "pending" ? "secondary" : dispute.status === "resolved" ? "default" : "outline"}>
                              {dispute.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{firestoreTimestampToDate(dispute.createdAt)?.toLocaleDateString() || "Invalid Date"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <div className="space-y-4 mt-4">
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by buyer email, item name..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => exportToCSV((historyData as any)?.transactions || [])}
                      disabled={!(historyData as any)?.transactions || (historyData as any).transactions.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="dateFrom">Date From</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={historyDateFrom}
                        onChange={(e) => setHistoryDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateTo">Date To</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={historyDateTo}
                        onChange={(e) => setHistoryDateTo(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="minAmount">Min Amount (₦)</Label>
                      <Input
                        id="minAmount"
                        type="number"
                        placeholder="0"
                        value={historyMinAmount}
                        onChange={(e) => setHistoryMinAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxAmount">Max Amount (₦)</Label>
                      <Input
                        id="maxAmount"
                        type="number"
                        placeholder="1000000"
                        value={historyMaxAmount}
                        onChange={(e) => setHistoryMaxAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : !(historyData as any)?.transactions || (historyData as any).transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No completed transactions found
                  </div>
                ) : (
                  <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                      Total: {(historyData as any)?.total || (historyData as any)?.transactions?.length || 0} transactions
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Buyer Email</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(historyData as any).transactions.map((transaction: any) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">{transaction.itemName}</TableCell>
                            <TableCell>{transaction.buyerEmail}</TableCell>
                            <TableCell>₦{parseFloat(transaction.price).toFixed(2)}</TableCell>
                            <TableCell className="text-red-600">-₦{parseFloat(transaction.commission).toFixed(2)}</TableCell>
                            <TableCell>{formatFirestoreDate(transaction.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/transaction/${transaction.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
