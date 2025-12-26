import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const transactionSchema = z.object({
  buyerEmail: z.string().email("Invalid buyer email"),
  itemName: z.string().min(1, "Item name is required"),
  itemDescription: z.string().min(1, "Item description is required"),
  price: z.string().min(1, "Price is required"),
  escrowCategory: z.string().min(1, "Escrow category is required"),
});

type TransactionForm = z.infer<typeof transactionSchema>;

export const CreateTransaction = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userData } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["/api/escrow-categories"],
  });

  // Check if seller has bank account set up
  const hasBankAccount = userData?.user?.bankCode && userData?.user?.accountNumber && userData?.user?.accountName;

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      buyerEmail: "",
      itemName: "",
      itemDescription: "",
      price: "",
      escrowCategory: "",
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      return await res.json();
    },
    onSuccess: (response: { transaction: any }) => {
      toast({
        title: "Transaction created",
        description: "Share the link with your buyer",
      });
      // Invalidate both seller transactions and the specific transaction query
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/seller"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/id", response.transaction.id] });
      // Stay on the transaction details page to show the link and allow copying
      setLocation(`/transaction/${response.transaction.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create transaction",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    // Find the selected category to get timeframe
    const selectedCategory = (categoriesData as any)?.categories?.find((cat: any) => cat.name === data.escrowCategory);
    const transactionData = {
      ...data,
      minTimeHours: selectedCategory?.minTime || 24,
      maxTimeHours: selectedCategory?.maxTime || 168,
    };
    createTransactionMutation.mutate(transactionData);
  });

  if (!userData) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <p>Please login first</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-[#041d0f] mb-2">Create Transaction</h1>
            <p className="text-gray-600">Set up a secure escrow transaction</p>
          </header>

          {!hasBankAccount && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-yellow-600 mt-0.5">⚠️</div>
                <div className="flex-1">
                  <p className="font-medium text-yellow-900">Bank Account Required</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You need to set up your bank account in Settings to receive automatic payouts when transactions complete.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/settings")}
                    className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  >
                    Set Up Bank Account
                  </Button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="buyerEmail">Buyer Email Address</Label>
              <Input
                id="buyerEmail"
                data-testid="input-buyerEmail"
                {...form.register("buyerEmail")}
                type="email"
                className="h-12"
              />
              {form.formState.errors.buyerEmail && (
                <p className="text-sm text-red-500">{form.formState.errors.buyerEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                data-testid="input-itemName"
                {...form.register("itemName")}
                type="text"
                className="h-12"
              />
              {form.formState.errors.itemName && (
                <p className="text-sm text-red-500">{form.formState.errors.itemName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemDescription">Item Description</Label>
              <Textarea
                id="itemDescription"
                data-testid="input-itemDescription"
                {...form.register("itemDescription")}
                rows={4}
              />
              {form.formState.errors.itemDescription && (
                <p className="text-sm text-red-500">{form.formState.errors.itemDescription.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                data-testid="input-price"
                {...form.register("price")}
                type="number"
                step="0.01"
                className="h-12"
              />
              {form.formState.errors.price && (
                <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="escrowCategory">Escrow Category *</Label>
              <Select
                value={form.watch("escrowCategory")}
                onValueChange={(value) => form.setValue("escrowCategory", value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {(categoriesData as any)?.categories?.map((category: any) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name} - {category.typicalTimeFrame}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.escrowCategory && (
                <p className="text-sm text-red-500">{form.formState.errors.escrowCategory.message}</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Note: A 10% service commission will be added to the price
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/seller-dashboard")}
                data-testid="button-cancel"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="button-create"
                disabled={createTransactionMutation.isPending}
                className="flex-1 bg-[#493d9e] hover:bg-[#493d9e]/90"
              >
                {createTransactionMutation.isPending ? "Creating..." : "Create Transaction"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
