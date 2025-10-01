import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatisticsCard } from "@/components/StatisticsCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, CheckCircle, DollarSign, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type Transaction } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const SellerDashboard = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions/buyer", userData?.user?.id],
    enabled: !!userData?.user,
  });

  const releaseFundsMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return await apiRequest("PATCH", `/api/transactions/${transactionId}/status`, {
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/buyer", userData?.user?.id] });
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

  return (
    <div className="p-8">
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
          <Card>
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
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
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
