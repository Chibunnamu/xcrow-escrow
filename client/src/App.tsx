import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/AuthProvider";
import { SellerDashboard } from "./pages/SellerDashboard";
import Login from "./pages/Login";
import {CreateAccount} from "./pages/CreateAccount";
import {TransactionDetails} from "./pages/TransactionDetails";
import {CreateTransaction} from "./pages/CreateTransaction";
import {Settings} from "./pages/Settings";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Router>
          <AuthProvider>
            <Route path="/" component={SellerDashboard} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={CreateAccount} />
            <Route path="/transaction/:id" component={TransactionDetails} />
            <Route path="/create-transaction" component={CreateTransaction} />
            <Route path="/profile" component={Settings} />
            <Toaster />
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
