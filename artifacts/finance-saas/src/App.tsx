import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, useAuth, useUser, useClerk } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
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
import SSOCallback from "@/pages/SSOCallback";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ADMIN_EMAILS = ["venu.vegi@inventninvest.com"];
const PREAPPROVED_EMAILS = ["pitch@inventninvest.com"];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

type AccessStatus = "loading" | "approved" | "pending" | "denied" | "not_found";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function PendingApprovalPage({ status }: { status: "pending" | "denied" }) {
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const logoImg = "/images/ini-logo-transparent.png";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col items-center justify-center px-4">
      <img src={logoImg} alt="iNi" className="h-10 mb-8" style={{ mixBlendMode: "multiply" }} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-md w-full text-center">
        {status === "pending" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Request Pending Review</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Your access request has been received. Venu is reviewing it personally and will reach out within 1–2 business days.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
              <p className="text-xs text-primary font-semibold mb-1">What happens next?</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Venu reviews your request personally</li>
                <li>• We'll schedule a 30-min personalized demo</li>
                <li>• You'll get full access to the platform</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Access Not Approved</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Your request wasn't approved at this time. Please reach out to <a href="mailto:info@inventninvest.com" className="text-primary font-medium">info@inventninvest.com</a> if you believe this is a mistake.
            </p>
          </>
        )}
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate("/login");
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) return <Spinner />;
  if (!isSignedIn) return null;
  return <>{children}</>;
}

function AccessGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<AccessStatus>("loading");

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (!email) return;
    if (ADMIN_EMAILS.includes(email) || PREAPPROVED_EMAILS.includes(email)) { setStatus("approved"); return; }

    fetch(`${API_BASE}/api/access-requests/status?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data: { status: string }) => {
        const s = data.status as AccessStatus;
        if (s === "approved") setStatus("approved");
        else if (s === "pending") setStatus("pending");
        else if (s === "denied") setStatus("denied");
        else { navigate("/request-access"); }
      })
      .catch(() => { navigate("/request-access"); });
  }, [email, navigate]);

  if (status === "loading") return <Spinner />;
  if (status === "approved") return <>{children}</>;
  if (status === "pending" || status === "denied") return <PendingApprovalPage status={status} />;
  return null;
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

      <Route path="/admin">
        <RequireAuth>
          <AccessGate>
            <Admin />
          </AccessGate>
        </RequireAuth>
      </Route>

      <Route>
        <RequireAuth>
          <AccessGate>
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
          </AccessGate>
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
