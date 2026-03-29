import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";

import Landing from "@/pages/Landing";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import RequestAccess from "@/pages/RequestAccess";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
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
import BulkImport from "@/pages/BulkImport";
import SSOCallback from "@/pages/SSOCallback";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const ADMIN_EMAILS = ["venu.vegi@inventninvest.com", "pitch@inventninvest.com"];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const screenshotMode = import.meta.env.VITE_SCREENSHOT_MODE === "true";

  useEffect(() => {
    if (!screenshotMode && isLoaded && !isSignedIn) navigate("/login");
  }, [isLoaded, isSignedIn, navigate, screenshotMode]);

  if (!screenshotMode && !isLoaded) return <Spinner />;
  if (!screenshotMode && !isSignedIn) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/landing"><Redirect to="/" /></Route>
      <Route path="/login" component={SignIn} />
      <Route path="/signup" component={SignUp} />
      <Route path="/sso-callback" component={SSOCallback} />
      <Route path="/request-access" component={RequestAccess} />
      <Route path="/demo"><Redirect to="/request-access" /></Route>

      <Route path="/admin">
        <RequireAuth>
          <Admin />
        </RequireAuth>
      </Route>

      <Route>
        <RequireAuth>
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
              <Route path="/import" component={BulkImport} />
              <Route path="/settings/:tab?" component={Settings} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
