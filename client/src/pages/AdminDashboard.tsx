import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch admin data
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/transactions");
      return res.json();
    },
  });

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
  });

  const { data: disputes, refetch: refetchDisputes } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/disputes");
      return res.json();
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/logs");
      return res.json();
    },
  });

  const updateTransactionStatus = async (transactionId: string, status: string) => {
    try {
      await apiRequest("POST", `/api/admin/transactions/${transactionId}/status`, { status, adminNotes });
      toast({ title: "Success", description: "Transaction status updated" });
      refetchTransactions();
      setSelectedTransaction(null);
      setAdminNotes("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to update transaction", variant: "destructive" });
    }
  };

  const addAdminNotes = async (transactionId: string) => {
    try {
      await apiRequest("POST", `/api/admin/transactions/${transactionId}/notes`, { notes: adminNotes });
      toast({ title: "Success", description: "Notes added successfully" });
      refetchTransactions();
      setSelectedTransaction(null);
      setAdminNotes("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to add notes", variant: "destructive" });
    }
  };

  const changeUserRole = async (userId: string, role: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/role`, { role });
      toast({ title: "Success", description: "User role updated" });
      refetchUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update user role", variant: "destructive" });
    }
  };

  const changeUserStatus = async (userId: string, status: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/status`, { status });
      toast({ title: "Success", description: "User status updated" });
      refetchUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update user status", variant: "destructive" });
    }
  };

  const stats = {
    totalTransactions: transactions?.length || 0,
    pendingTransactions: transactions?.filter((t: any) => t.status === "pending").length || 0,
    activeTransactions: transactions?.filter((t: any) => t.status === "active").length || 0,
    completedTransactions: transactions?.filter((t: any) => t.status === "completed").length || 0,
    totalUsers: users?.length || 0,
    activeUsers: users?.filter((u: any) => u.status === "active").length || 0,
    blockedUsers: users?.filter((u: any) => u.status === "blocked").length || 0,
    totalDisputes: disputes?.length || 0,
    openDisputes: disputes?.filter((d: any) => d.status === "open").length || 0,
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openDisputes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.id.slice(0, 8)}</TableCell>
                      <TableCell>{transaction.itemName}</TableCell>
                      <TableCell>
                        <Badge variant={
                          transaction.status === "completed" ? "default" :
                          transaction.status === "active" ? "secondary" :
                          transaction.status === "pending" ? "outline" : "destructive"
                        }>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>₦{transaction.price}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedTransaction(transaction)}>
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage Transaction</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Status</Label>
                                <Select onValueChange={(value) => updateTransactionStatus(transaction.id, value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Change status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="asset_transferred">Asset Transferred</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Admin Notes</Label>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add admin notes..."
                                />
                              </div>
                              <Button onClick={() => addAdminNotes(transaction.id)}>
                                Add Notes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role || "user"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>
                          {user.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select onValueChange={(value) => changeUserRole(user.id, value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Change Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="support">Support</SelectItem>
                              <SelectItem value="superAdmin">SuperAdmin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select onValueChange={(value) => changeUserStatus(user.id, value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Change Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <CardTitle>All Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes?.map((dispute: any) => (
                    <TableRow key={dispute.id}>
                      <TableCell>{dispute.id.slice(0, 8)}</TableCell>
                      <TableCell>{dispute.transactionId.slice(0, 8)}</TableCell>
                      <TableCell>{dispute.reason}</TableCell>
                      <TableCell>
                        <Badge variant={dispute.status === "resolved" ? "default" : "destructive"}>
                          {dispute.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.performedBy.slice(0, 8)}</TableCell>
                      <TableCell>{new Date(log.timestamp?.toDate?.() || log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{JSON.stringify(log, null, 2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
