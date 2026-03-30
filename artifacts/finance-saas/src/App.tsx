import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import React, { useEffect, useState } from "react";
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
const SUPER_ADMIN = "venu.vegi@inventninvest.com";

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
  const { user } = useUser();
  const [, navigate] = useLocation();
  const screenshotMode = import.meta.env.VITE_SCREENSHOT_MODE === "true";

  if (screenshotMode) {
    if (!localStorage.getItem("ini_platform_access_allowed")) {
      localStorage.setItem("ini_platform_access_allowed", "demo");
    }
    if (!localStorage.getItem("ini_platform_access")) {
      localStorage.setItem("ini_platform_access", "demo");
    }
  }

  const [accessChecked, setAccessChecked] = useState(screenshotMode);

  useEffect(() => {
    if (screenshotMode) return;
    if (!isLoaded) return;
    if (!isSignedIn) { navigate("/login"); return; }
    if (!user) return;

    const email = user.primaryEmailAddress?.emailAddress ?? "";

    // Super admin bypasses DB — always full access
    if (email === SUPER_ADMIN) {
      localStorage.setItem("ini_platform_access_allowed", "both");
      if (!localStorage.getItem("ini_platform_access")) {
        localStorage.setItem("ini_platform_access", "app");
      }
      setAccessChecked(true);
      return;
    }

    // Every other user — access is exactly what the admin approved in the DB
    fetch(`/api/access-requests/status/${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then((data: { status: string; platformAccess?: string }) => {
        if (data.status === "approved") {
          const allowed = data.platformAccess ?? "demo";
          localStorage.setItem("ini_platform_access_allowed", allowed);
          // Strictly enforce: non-"both" users always land on their approved mode
          if (allowed !== "both") {
            localStorage.setItem("ini_platform_access", allowed);
          } else if (!localStorage.getItem("ini_platform_access")) {
            localStorage.setItem("ini_platform_access", "app");
          }
          // Admin-only users go straight to the admin panel
          if (allowed === "admin") {
            navigate("/admin");
          }
          setAccessChecked(true);
        } else {
          navigate("/request-access");
        }
      })
      .catch(() => {
        setAccessChecked(true);
      });
  }, [isLoaded, isSignedIn, user, navigate, screenshotMode]);

  if (!screenshotMode && !isLoaded) return <Spinner />;
  if (!screenshotMode && !isSignedIn) return null;
  if (!screenshotMode && !accessChecked) return <Spinner />;
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
      <Route path="/demo"><Redirect to="/login" /></Route>

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
