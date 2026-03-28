import { useLocation } from "wouter";
import { SignUp as ClerkSignUp, useAuth } from "@clerk/clerk-react";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

const logoImg = "/images/ini-logo-transparent.png";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUp() {
  const [, navigate] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/app");
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col">
      <nav className="h-14 flex items-center justify-between px-6 md:px-10 bg-white/80 backdrop-blur border-b border-slate-100">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img src={logoImg} alt="iNi" className="h-8 w-auto" style={{ mixBlendMode: "multiply" }} />
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </button>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <ClerkSignUp
          routing="hash"
          fallbackRedirectUrl={`${BASE}/app`}
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "shadow-sm border border-slate-100 rounded-2xl",
              headerTitle: "text-2xl font-black text-slate-900",
              headerSubtitle: "text-slate-500",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-sm font-bold",
              footerActionLink: "text-primary font-semibold",
              formFieldInput: "border-slate-200 focus:ring-primary/20 focus:border-primary rounded-lg text-sm",
              socialButtonsBlockButton: "border-slate-200 hover:bg-slate-50 text-slate-700",
            },
          }}
        />
      </div>
    </div>
  );
}
