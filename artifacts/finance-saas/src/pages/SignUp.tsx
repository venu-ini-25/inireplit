import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSignUp, useAuth } from "@clerk/clerk-react";
import { Eye, EyeOff, Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

const logoImg = "/images/ini-logo-transparent.png";

export default function SignUp() {
  const [, navigate] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [code, setCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate("/app");
  }, [isLoaded, isSignedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp || !signUpLoaded) return;
    setLoading(true);
    setError("");
    try {
      await signUp.create({
        firstName: form.firstName,
        lastName: form.lastName,
        emailAddress: form.email,
        password: form.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr?.errors?.[0]?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/app");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr?.errors?.[0]?.message ?? "Incorrect code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "oauth_google" | "oauth_apple" | "oauth_microsoft") => {
    if (!signUp) return;
    setOauthLoading(provider);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    await signUp.authenticateWithRedirect({
      strategy: provider,
      redirectUrl: `${base}/sso-callback`,
      redirectUrlComplete: `${base}/app`,
    });
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [f]: e.target.value }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col">
      <nav className="h-14 flex items-center justify-between px-6 md:px-10 bg-white/80 backdrop-blur border-b border-slate-100">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img src={logoImg} alt="iNi" className="h-8 w-auto" style={{ mixBlendMode: "multiply" }} />
        </button>
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </button>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoImg} alt="iNi" className="h-12 w-auto mx-auto mb-4" style={{ mixBlendMode: "multiply" }} />
            <h1 className="text-2xl font-black text-slate-900">{step === "verify" ? "Verify your email" : "Create your account"}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {step === "verify" ? `We sent a 6-digit code to ${form.email}` : "Join iNi — the finance platform built for growth-stage leaders."}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            {step === "verify" ? (
              <>
                <div className="flex items-center justify-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-primary" />
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Verification Code</label>
                    <input type="text" value={code} onChange={e => setCode(e.target.value)} required maxLength={6}
                      placeholder="Enter 6-digit code" className={inputCls + " text-center text-lg tracking-widest font-bold"} autoFocus />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Verifying…" : "Verify & Continue"}
                  </button>
                </form>
                <button onClick={() => setStep("form")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors">
                  ← Back to sign up
                </button>
              </>
            ) : (
              <>
                {/* Social buttons */}
                <div className="flex flex-col gap-2.5 mb-6">
                  <button onClick={() => handleOAuth("oauth_google")} disabled={!!oauthLoading}
                    className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
                    {oauthLoading === "oauth_google" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    )}
                    Continue with Google
                  </button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button onClick={() => handleOAuth("oauth_apple")} disabled={!!oauthLoading}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
                      {oauthLoading === "oauth_apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                      )}
                      Apple
                    </button>
                    <button onClick={() => handleOAuth("oauth_microsoft")} disabled={!!oauthLoading}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
                      {oauthLoading === "oauth_microsoft" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M13 1h10v10H13z"/><path fill="#7fba00" d="M1 13h10v10H1z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>
                      )}
                      Microsoft
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-muted-foreground">or sign up with email</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
                      <input type="text" value={form.firstName} onChange={set("firstName")} required placeholder="Venu" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
                      <input type="text" value={form.lastName} onChange={set("lastName")} required placeholder="Vegi" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email</label>
                    <input type="email" value={form.email} onChange={set("email")} required placeholder="you@company.com" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} required minLength={8} placeholder="Min 8 characters" className={inputCls + " pr-10"} />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Creating account…" : "Create Account"}
                  </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-5">
                  Already have an account?{" "}
                  <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">Sign in</button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
