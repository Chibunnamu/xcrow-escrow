import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/useAuth";
import NotFound from "@/pages/not-found";
import { DashboardLayout } from "@/components/DashboardLayout";

import { CreateAccount } from "@/pages/CreateAccount";
import { Login } from "@/pages/Login";
import { SellerDashboard } from "@/pages/SellerDashboard";
import { CreateTransaction } from "@/pages/CreateTransaction";
import { TransactionDetails } from "@/pages/TransactionDetails";
import { PaymentPage } from "@/pages/PaymentPage";
import { PaymentSuccess } from "@/pages/PaymentSuccess";
import { BuyerConfirmation } from "@/pages/BuyerConfirmation";
import { LandingPage } from "./pages/LandingPage";
import Office from "@/pages/Office";
import { Settings } from "@/pages/Settings";
import { Marketplace } from "@/pages/Marketplace";
import { Notifications } from "@/pages/Notifications";

function Router() {
  return (
    <Switch>
      {/* Auth pages */}
      <Route path="/" component={LandingPage} />
      <Route path="/register" component={CreateAccount} />
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
      <Route path="/marketplace">
        <DashboardLayout>
          <Marketplace />
        </DashboardLayout>
      </Route>
      <Route path="/notifications">
        <DashboardLayout>
          <Notifications />
        </DashboardLayout>
      </Route>

      {/* Transaction pages */}
      <Route path="/transaction/:id" component={TransactionDetails} />
      <Route path="/payment/:id" component={PaymentPage} />
      <Route path="/payment-success/:reference" component={PaymentSuccess} />
      <Route path="/buyer-confirm/:id" component={BuyerConfirmation} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
