import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, Building2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Bank {
  id: number;
  code: string;
  name: string;
}

export const Settings = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedBankCode, setSelectedBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [verifiedAccountName, setVerifiedAccountName] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);

  const { data: userData, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const { data: banksData, isLoading: banksLoading } = useQuery<{ banks: Bank[] }>({
    queryKey: ["/api/banks"],
    enabled: !!userData,
  });

  const verifyAccountMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBankCode || !accountNumber) {
        throw new Error("Please select a bank and enter account number");
      }
      
      if (accountNumber.length !== 10) {
        throw new Error("Account number must be 10 digits");
      }

      const res = await apiRequest("POST", "/api/bank-account/verify", {
        bankCode: selectedBankCode,
        accountNumber,
      });
      return await res.json();
    },
    onSuccess: (data: { accountName: string; accountNumber: string }) => {
      setVerifiedAccountName(data.accountName);
      setIsVerified(true);
      toast({
        title: "Account Verified",
        description: `Account name: ${data.accountName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Could not verify account details",
        variant: "destructive",
      });
    },
  });

  const saveBankAccountMutation = useMutation({
    mutationFn: async () => {
      if (!isVerified || !verifiedAccountName) {
        throw new Error("Please verify your account first");
      }

      const res = await apiRequest("POST", "/api/bank-account", {
        bankCode: selectedBankCode,
        accountNumber,
        accountName: verifiedAccountName,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Bank Account Saved",
        description: "Your bank account details have been updated successfully",
      });
      
      setSelectedBankCode("");
      setAccountNumber("");
      setVerifiedAccountName("");
      setIsVerified(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save bank account details",
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    verifyAccountMutation.mutate();
  };

  const handleSave = () => {
    saveBankAccountMutation.mutate();
  };

  const handleBankChange = (value: string) => {
    setSelectedBankCode(value);
    setIsVerified(false);
    setVerifiedAccountName("");
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(value);
    setIsVerified(false);
    setVerifiedAccountName("");
  };

  useEffect(() => {
    if (!userLoading && !userData) {
      setLocation("/login");
    }
  }, [userData, userLoading, setLocation]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#493d9e]" />
      </div>
    );
  }

  const user = userData;
  const hasBankAccount = user.bankCode && user.accountNumber && user.accountName;
  const selectedBank = banksData?.banks.find(bank => bank.code === selectedBankCode);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and bank details for automatic payouts</p>
        </header>

        <div className="space-y-6">
          {/* Bank Account Setup Card */}
          <Card>
            <CardHeader>
              <CardTitle>{hasBankAccount ? "Update Bank Account" : "Bank Account Setup"}</CardTitle>
              <CardDescription>
                {hasBankAccount 
                  ? "Update your bank account details for automatic payouts" 
                  : "Add your bank account to receive automatic payouts"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bank Selection */}
              <div className="space-y-2">
                <Label htmlFor="bank">Select Bank</Label>
                {banksLoading ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-500">Loading banks...</span>
                  </div>
                ) : (
                  <Select 
                    value={selectedBankCode} 
                    onValueChange={handleBankChange}
                    disabled={verifyAccountMutation.isPending || saveBankAccountMutation.isPending}
                  >
                    <SelectTrigger id="bank" data-testid="select-bank" className="h-12">
                      <SelectValue placeholder="Choose your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banksData?.banks.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  data-testid="input-account-number"
                  type="text"
                  placeholder="Enter 10-digit account number"
                  value={accountNumber}
                  onChange={handleAccountNumberChange}
                  disabled={verifyAccountMutation.isPending || saveBankAccountMutation.isPending}
                  className="h-12"
                  maxLength={10}
                />
                {accountNumber.length > 0 && accountNumber.length !== 10 && (
                  <p className="text-sm text-red-500">Account number must be 10 digits</p>
                )}
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                disabled={
                  !selectedBankCode || 
                  accountNumber.length !== 10 || 
                  verifyAccountMutation.isPending ||
                  saveBankAccountMutation.isPending ||
                  isVerified
                }
                variant={isVerified ? "outline" : "default"}
                className={isVerified ? "border-green-500 text-green-700" : "bg-[#493d9e] hover:bg-[#493d9e]/90"}
                data-testid="button-verify-account"
              >
                {verifyAccountMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : isVerified ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verified
                  </>
                ) : (
                  "Verify Account"
                )}
              </Button>

              {/* Verified Account Name */}
              {isVerified && verifiedAccountName && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4" data-testid="verified-account-info">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">Account Verified</p>
                      <p className="text-sm text-green-700 mt-1">
                        Account Name: <span className="font-semibold" data-testid="text-verified-name">{verifiedAccountName}</span>
                      </p>
                      <p className="text-sm text-green-700">
                        Bank: <span className="font-semibold">{selectedBank?.name}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={
                    !isVerified || 
                    !verifiedAccountName ||
                    saveBankAccountMutation.isPending
                  }
                  className="bg-[#493d9e] hover:bg-[#493d9e]/90"
                  data-testid="button-save-bank-account"
                >
                  {saveBankAccountMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Bank Account"
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedBankCode("");
                    setAccountNumber("");
                    setVerifiedAccountName("");
                    setIsVerified(false);
                  }}
                  variant="outline"
                  disabled={verifyAccountMutation.isPending || saveBankAccountMutation.isPending}
                  data-testid="button-reset"
                >
                  Reset
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-1">How it works</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Select your bank and enter your account number</li>
                  <li>• Click "Verify Account" to confirm your details with Paystack</li>
                  <li>• Review the verified account name</li>
                  <li>• Click "Save Bank Account" to complete the setup</li>
                  <li>• Payouts will be automatically sent to this account when transactions complete</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Current Bank Account Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#493d9e]" />
                Current Bank Account
              </CardTitle>
              <CardDescription>Your registered bank account for receiving payouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasBankAccount ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Bank Name</Label>
                    <p className="font-medium text-gray-900" data-testid="text-current-bank">
                      {banksData?.banks.find(bank => bank.code === user.bankCode)?.name || user.bankCode}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Account Number</Label>
                    <p className="font-medium text-gray-900" data-testid="text-current-account">
                      {user.accountNumber}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Account Name</Label>
                    <p className="font-medium text-gray-900" data-testid="text-current-name">
                      {user.accountName}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No bank account configured yet. Add your bank account details above to receive automatic payouts.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
