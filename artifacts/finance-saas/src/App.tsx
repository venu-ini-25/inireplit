import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";

import Landing from "@/pages/Landing";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import RequestAccess from "@/pages/RequestAccess";
import Settings from "@/pages/Settings";
import Dashboard from "@/pages/Dashboard";
import FinancePL from "@/pages/FinancePL";
import FinanceCashFlow from "@/pages/FinanceCashFlow";
import FinanceExpenses from "@/pages/FinanceExpenses";
import Operations from "@/pages/Operations";
import Product from "@/pages/Product";
import Marketing from "@/pages/Marketing";
import Sales from "@/pages/Sales";
import People from "@/pages/People";
import Portfolio from "@/pages/Portfolio";
import PortfolioDetail from "@/pages/PortfolioDetail";
import MASupport from "@/pages/MASupport";
import Reports from "@/pages/Reports";
import ProfessionalServices from "@/pages/ProfessionalServices";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public pages — no sidebar */}
      <Route path="/" component={Landing} />
      <Route path="/landing">
        <Redirect to="/" />
      </Route>
      <Route path="/login" component={SignIn} />
      <Route path="/signup" component={SignUp} />
      <Route path="/request-access" component={RequestAccess} />

      {/* App pages — inside Layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/app" component={Dashboard} />
            <Route path="/finance/pl" component={FinancePL} />
            <Route path="/finance/cashflow" component={FinanceCashFlow} />
            <Route path="/finance/expenses" component={FinanceExpenses} />
            <Route path="/operations" component={Operations} />
            <Route path="/product" component={Product} />
            <Route path="/marketing" component={Marketing} />
            <Route path="/sales" component={Sales} />
            <Route path="/people" component={People} />
            <Route path="/portfolio" component={Portfolio} />
            <Route path="/portfolio/:id" component={PortfolioDetail} />
            <Route path="/ma" component={MASupport} />
            <Route path="/reports" component={Reports} />
            <Route path="/services" component={ProfessionalServices} />
            <Route path="/settings/:tab?" component={Settings} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
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
