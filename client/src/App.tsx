import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { DashboardLayout } from "@/components/DashboardLayout";

import { CreateAccount } from "@/pages/CreateAccount";
import { Login } from "@/pages/Login";
import { SellerDashboard } from "@/pages/SellerDashboard";
import { CreateTransaction } from "@/pages/CreateTransaction";
import { TransactionDetails } from "@/pages/TransactionDetails";
import { PaymentPage } from "@/pages/PaymentPage";
import { BuyerConfirmation } from "@/pages/BuyerConfirmation";
import Office from "@/pages/Office";
import { Settings } from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      {/* Auth pages */}
      <Route path="/" component={CreateAccount} />
      <Route path="/login" component={Login} />
      
      {/* Seller pages with dashboard layout */}
      <Route path="/seller-dashboard">
        <DashboardLayout>
          <SellerDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/create-transaction">
        <DashboardLayout>
          <CreateTransaction />
        </DashboardLayout>
      </Route>
      <Route path="/office">
        <DashboardLayout>
          <Office />
        </DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      
      {/* Transaction pages */}
      <Route path="/transaction/:link" component={TransactionDetails} />
      <Route path="/payment/:link" component={PaymentPage} />
      <Route path="/buyer-confirm/:link" component={BuyerConfirmation} />
      
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
