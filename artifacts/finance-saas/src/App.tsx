import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";

// Import pages
import Dashboard from "@/pages/Dashboard";
import FinancePL from "@/pages/FinancePL";
import FinanceCashFlow from "@/pages/FinanceCashFlow";
import FinanceExpenses from "@/pages/FinanceExpenses";
import Portfolio from "@/pages/Portfolio";
import Reports from "@/pages/Reports";
import MASupport from "@/pages/MASupport";

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/finance/pl" component={FinancePL} />
        <Route path="/finance/cashflow" component={FinanceCashFlow} />
        <Route path="/finance/expenses" component={FinanceExpenses} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/reports" component={Reports} />
        <Route path="/ma" component={MASupport} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
