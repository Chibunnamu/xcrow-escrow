import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { CreateAccount } from "@/pages/CreateAccount";
import { Login } from "@/pages/Login";
import { SellerDashboard } from "@/pages/SellerDashboard";
import { CreateTransaction } from "@/pages/CreateTransaction";
import { TransactionDetails } from "@/pages/TransactionDetails";
import { PaymentPage } from "@/pages/PaymentPage";
import { BuyerConfirmation } from "@/pages/BuyerConfirmation";

function Router() {
  return (
    <Switch>
      {/* Auth pages */}
      <Route path="/" component={CreateAccount} />
      <Route path="/login" component={Login} />
      
      {/* Seller pages */}
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/create-transaction" component={CreateTransaction} />
      
      {/* Transaction pages */}
      <Route path="/transaction/:link" component={TransactionDetails} />
      <Route path="/payment/:transactionId" component={PaymentPage} />
      <Route path="/buyer-confirm/:transactionId" component={BuyerConfirmation} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
