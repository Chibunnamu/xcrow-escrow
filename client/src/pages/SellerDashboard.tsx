import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatisticsCard } from "@/components/StatisticsCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, CheckCircle, DollarSign, Loader2, Info, Copy, Search, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type Transaction, type Payout } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { useState } from "react";
import { firestoreTimestampToDate } from "../utils/firestoreTimestampToDate";

export const SellerDashboard = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [transactionLink, setTransactionLink] = useState("");

  const { data: userData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/user"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalTransactions: number;
    successRate: number;
    escrowVolume: number;
    totalTransactionsChange: number;
    successRateChange: number;
    escrowVolumeChange: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!userData?.user,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<{ data: Array<{ month: string; amount: number }> }>({
    queryKey: ["/api/dashboard/transactions-over-time"],
    enabled: !!userData?.user,
  });

  const { data: activitiesData, isLoading: activitiesLoading } = useQuery<{
    activities: Array<{ id: string; activity: string; details: string; time: string }>;
  }>({
    queryKey: ["/api/dashboard/recent-activities"],
    enabled: !!userData?.user,
  });

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ["/api/transactions/buyer"],
    enabled: !!userData?.user,
  });

  const purchases = Array.isArray(purchasesData?.transactions) ? purchasesData.transactions : [];

  type PayoutWithTransaction = Payout & { transaction: Transaction };

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery<{ payouts: PayoutWithTransaction[] }>({
    queryKey: ["/api/payouts"],
    enabled: !!userData?.user,
  });

  const releaseFundsMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return await apiRequest("PATCH", `/api/transactions/${transactionId}/status`, {
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/buyer"] });
      toast({
        title: "Funds Released",
        description: "The funds have been successfully released to the seller.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to release funds. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!userData?.user) {
    setLocation("/login");
    return <></>;
  }

  const userName = userData.user.name || userData.user.email.split('@')[0];

  // Check if seller has bank account set up
  const hasBankAccount = userData.user.bankCode && userData.user.accountNumber && userData.user.accountName;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      paid: { label: "Paid", className: "bg-blue-100 text-blue-800" },
      asset_transferred: { label: "Asset Transferred", className: "bg-purple-100 text-purple-800" },
      completed: { label: "Completed", className: "bg-green-100 text-green-800" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.className} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  const getPayoutStatusBadge = (status: string) => {
    const statusConfig = {
      not_ready: { label: "Not Ready", className: "bg-gray-100 text-gray-800" },
      pending_settlement: { label: "Pending Settlement", className: "bg-orange-100 text-orange-800" },
      ready: { label: "Ready", className: "bg-yellow-100 text-yellow-800" },
      processing: { label: "Processing", className: "bg-blue-100 text-blue-800" },
      completed: { label: "Completed", className: "bg-green-100 text-green-800" },
      failed: { label: "Failed", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_ready;
    return (
      <Badge className={config.className} data-testid={`badge-payout-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Reference copied to clipboard",
    });
  };

  const handleTransactionSearch = () => {
    const link = transactionLink.trim();
    if (!link) return;

    // Handle different types of links
    try {
      // Check if it's a full URL
      let url;
      try {
        url = new URL(link);
      } catch {
        // Not a full URL, treat as relative path or ID
        url = null;
      }

      let path = url ? url.pathname : link;

      // Remove leading slash if present
      if (path.startsWith('/')) {
        path = path.substring(1);
      }

      // Determine where to navigate based on the path
      if (path.includes('/payment-success/') || path.startsWith('payment-success/')) {
        // Payment success page - extract reference
        const reference = path.split('/payment-success/')[1] || path.split('payment-success/')[1];
        if (reference) {
          setLocation(`/payment-success/${reference}`);
          return;
        }
      }

      if (path.includes('/payment/') || path.startsWith('payment/')) {
        // Payment page - extract link
        const paymentLink = path.split('/payment/')[1] || path.split('payment/')[1];
        if (paymentLink) {
          setLocation(`/payment/${paymentLink}`);
          return;
        }
      }

      if (path.includes('/buyer-confirm/') || path.startsWith('buyer-confirm/')) {
        // Buyer confirmation page - extract link
        const confirmLink = path.split('/buyer-confirm/')[1] || path.split('buyer-confirm/')[1];
        if (confirmLink) {
          setLocation(`/buyer-confirm/${confirmLink}`);
          return;
        }
      }

      if (path.includes('/transaction/') || path.startsWith('transaction/')) {
        // Transaction details page - extract link
        const transactionId = path.split('/transaction/')[1] || path.split('transaction/')[1];
        if (transactionId) {
          setLocation(`/transaction/${transactionId}`);
          return;
        }
      }

      // Default: assume it's a transaction link/ID and go to transaction details
      setLocation(`/transaction/${link}`);

    } catch (error) {
      console.error('Error parsing transaction link:', error);
      // Fallback to transaction details
      setLocation(`/transaction/${link}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTransactionSearch();
    }
  };

  return (
    <div className="p-8">
      {/* Transaction Search Section */}
      <Card className="mb-8 bg-gradient-to-r from-[#493d9e] to-[#5a4fc8] border-none">
        <CardContent className="p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Have a Transaction Link?
            </h2>
            <p className="text-lg text-gray-200 mb-6">
              Enter your transaction ID or link to view and manage the transaction
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Input
                type="text"
                placeholder="Enter transaction ID, link, or URL..."
                value={transactionLink}
                onChange={(e) => setTransactionLink(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-12 text-lg bg-white border-0 focus:ring-2 focus:ring-white/50"
              />
              <Button
                onClick={handleTransactionSearch}
                disabled={!transactionLink.trim()}
                className="h-12 px-6 bg-white text-[#493d9e] hover:bg-gray-100 font-semibold"
              >
                <Search className="w-5 h-5 mr-2" />
                Go to Link
              </Button>
            </div>
            <p className="text-sm text-gray-200 mt-2 text-center">
              Supports transaction IDs, payment links, confirmation links, and full URLs
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Banner */}
      <Card className="mb-8 bg-gradient-to-r from-[#f8f9ff] to-white border-none">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome {userName.charAt(0).toUpperCase() + userName.slice(1)}
              </h1>
              <p className="text-gray-600 mb-6">
                Secure your transactions with trusted escrow services
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setLocation("/create-transaction")}
                  className="bg-[#493d9e] hover:bg-[#493d9e]/90"
                  data-testid="button-new-transaction"
                >
                  New Transaction
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/marketplace")}
                  data-testid="button-explore-marketplace"
                >
                  Explore Marketplace
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[#493d9e]/20 to-transparent flex items-center justify-center">
                <Users className="w-24 h-24 text-[#493d9e]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for My Sales and My Purchases */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="sales" data-testid="tab-my-sales">My Sales</TabsTrigger>
          <TabsTrigger value="purchases" data-testid="tab-my-purchases">My Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statsLoading ? (
              <div className="col-span-3 flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <>
                <StatisticsCard
                  icon={Users}
                  iconBgColor="bg-pink-100"
                  iconColor="text-pink-600"
                  title="Total Transactions"
                  value={stats?.totalTransactions || 0}
                  change={stats?.totalTransactionsChange || 0}
                  changeLabel="Since Last Month"
                />
                <StatisticsCard
                  icon={CheckCircle}
                  iconBgColor="bg-green-100"
                  iconColor="text-green-600"
                  title="Success Rate"
                  value={`${stats?.successRate || 0}%`}
                  change={stats?.successRateChange || 0}
                  changeLabel="Since Last Month"
                />
                <StatisticsCard
                  icon={DollarSign}
                  iconBgColor="bg-blue-100"
                  iconColor="text-blue-600"
                  title="Escrow Volume"
                  value={`₦${stats?.escrowVolume || 0}`}
                  change={stats?.escrowVolumeChange || 0}
                  changeLabel="Since Last Month"
                />
              </>
            )}
          </div>

          {/* Transactions Over Time Chart */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Transactions Over Time</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-[#493d9e]">12 months</Button>
                  <Button variant="ghost" size="sm">30 days</Button>
                  <Button variant="ghost" size="sm">7 days</Button>
                  <Button variant="ghost" size="sm">24 hours</Button>
                </div>
              </div>
              {chartLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      stroke="#999"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="#999"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#493d9e" 
                      strokeWidth={3}
                      fill="url(#colorAmount)"
                      dot={{ fill: '#493d9e', r: 4 }}
                    />
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#493d9e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#493d9e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activities</h2>
              {activitiesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {activitiesData?.activities && activitiesData.activities.length > 0 ? (
                        activitiesData.activities.map((activity) => (
                          <tr key={activity.id} className="hover:bg-gray-50" data-testid={`activity-row-${activity.id}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {activity.activity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {activity.details}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {activity.time}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/transaction/${activity.id}`)}
                                className="text-[#493d9e] border-[#493d9e] hover:bg-[#493d9e] hover:text-white"
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View Transaction
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                            No recent activities. Create your first transaction to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout History */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-gray-400 cursor-help" data-testid="icon-payout-info" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-2 text-xs">
                        <p><strong>Not Ready:</strong> Transaction not yet completed</p>
                        <p><strong>Pending Settlement:</strong> Funds received, waiting for Paystack settlement (24h)</p>
                        <p><strong>Ready:</strong> Funds settled, payout will be attempted</p>
                        <p><strong>Processing:</strong> Transfer in progress with Paystack</p>
                        <p><strong>Completed:</strong> Money successfully transferred to your bank</p>
                        <p><strong>Failed:</strong> Transfer failed (will retry automatically)</p>
                      </div>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              {payoutsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" data-testid="loader-payouts" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Transaction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Reference
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payoutsData?.payouts && payoutsData.payouts.length > 0 ? (
                        payoutsData.payouts.slice(0, 10).map((payout) => (
                          <tr key={payout.id} className="hover:bg-gray-50" data-testid={`payout-row-${payout.id}`}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900" data-testid={`payout-transaction-${payout.id}`}>
                              {payout.transaction.itemName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600" data-testid={`payout-amount-${payout.id}`}>
                              {formatCurrency(payout.amount)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="flex flex-col gap-1">
                                {getPayoutStatusBadge(payout.status)}
                                {payout.status === "failed" && payout.failureReason && (
                                  <span className="text-xs text-red-600" data-testid={`payout-failure-${payout.id}`}>
                                    {payout.failureReason}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid={`payout-date-${payout.id}`}>
                              {(() => {
                                const date = firestoreTimestampToDate(payout.createdAt);
                                if (!date) return "Invalid Date";
                                return format(date, "MMM dd, yyyy HH:mm");
                              })()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {payout.paystackReference ? (
                                <button
                                  onClick={() => copyToClipboard(payout.paystackReference!)}
                                  className="flex items-center gap-1 text-[#493d9e] hover:underline"
                                  data-testid={`button-copy-reference-${payout.id}`}
                                >
                                  <span className="truncate max-w-[150px]">{payout.paystackReference}</span>
                                  <Copy className="w-3 h-3 flex-shrink-0" />
                                </button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500" data-testid="text-no-payouts">
                            No payouts yet. Complete transactions to receive payouts.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">My Purchases</h2>
              {purchasesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Seller
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {purchases && purchases.length > 0 ? (
                        purchases.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-gray-50" data-testid={`purchase-row-${purchase.id}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid={`purchase-item-${purchase.id}`}>
                              {purchase.itemName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid={`purchase-seller-${purchase.id}`}>
                              {purchase.sellerId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid={`purchase-price-${purchase.id}`}>
                              ₦{purchase.price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {getStatusBadge(purchase.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {purchase.status === "asset_transferred" && (
                                <Button
                                  onClick={() => releaseFundsMutation.mutate(purchase.id)}
                                  disabled={releaseFundsMutation.isPending}
                                  className="bg-[#493d9e] hover:bg-[#493d9e]/90"
                                  size="sm"
                                  data-testid={`button-release-funds-${purchase.id}`}
                                >
                                  {releaseFundsMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Releasing...
                                    </>
                                  ) : (
                                    "Release Funds"
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                            No purchases yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
