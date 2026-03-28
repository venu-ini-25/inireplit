import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, ArrowLeft, AlertCircle } from "lucide-react";

const logoImg = "/images/ini-logo-transparent.png";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
      <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
    </svg>
  );
}

type AuthUser = { email: string; name: string; provider: string };

function saveUser(user: AuthUser) {
  localStorage.setItem("ini_user", JSON.stringify(user));
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("ini_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function SignIn() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [ssoMsg, setSsoMsg] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSSO = async (provider: "Google" | "Microsoft" | "Apple") => {
    setLoading(provider);
    setSsoMsg(null);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(null);
    setSsoMsg(`${provider} SSO is available for enterprise plans. Use email below to access the demo, or contact us to enable SSO for your organization.`);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading("email");
    await new Promise((r) => setTimeout(r, 1200));

    // Check if an account already exists in localStorage
    const stored = localStorage.getItem("ini_user");
    if (stored) {
      const user = JSON.parse(stored) as AuthUser;
      if (user.email === form.email) {
        setLoading(null);
        saveUser(user);
        navigate("/app");
        return;
      }
    }

    // No existing account — create one and go to request-access
    const newUser: AuthUser = { email: form.email, name: "", provider: "email" };
    saveUser(newUser);
    setLoading(null);
    navigate("/request-access");
  };

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
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to access the iNi platform</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
            {/* SSO Buttons */}
            <div className="space-y-3">
              {(["Google", "Microsoft", "Apple"] as const).map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleSSO(provider)}
                  disabled={!!loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 disabled:opacity-60"
                >
                  {loading === provider ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : provider === "Google" ? <GoogleIcon /> : provider === "Microsoft" ? <MicrosoftIcon /> : (
                    <AppleIcon />
                  )}
                  Continue with {provider}
                </button>
              ))}
            </div>

            {ssoMsg && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-2.5 text-xs text-slate-600 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {ssoMsg}
              </div>
            )}

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-muted-foreground">or continue with email</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  autoComplete="email"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!!loading}
                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading === "email" ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign In"}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-5">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-primary font-semibold hover:underline"
              >
                Create account
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5 leading-relaxed">
            By continuing, you agree to iNi's{" "}
            <span className="text-primary cursor-pointer hover:underline">Terms of Service</span> and{" "}
            <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
