import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck, Lock, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useResetPassword } from "@workspace/api-client-react";
import lightLogo from "@assets/Light_Logo_1774345301483.png";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");

  const resetMutation = useResetPassword();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const passwordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { label: "Too short", color: "#ef4444", width: "20%" };
    if (pwd.length < 8) return { label: "Weak", color: "#f97316", width: "40%" };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: "Fair", color: "#eab308", width: "60%" };
    if (!/[^A-Za-z0-9]/.test(pwd)) return { label: "Good", color: "#22c55e", width: "80%" };
    return { label: "Strong", color: "#10b981", width: "100%" };
  };

  const strength = passwordStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }
    if (!token) {
      setValidationError("Invalid or missing reset token. Please use the link from your email.");
      return;
    }

    resetMutation.mutate(
      { data: { token, password } },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => setLocation("/login"), 3000);
        },
        onError: (err: any) => {
          setValidationError(err?.message || "Invalid or expired reset link. Please request a new one.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          {/* Brand */}
          <div className="flex items-center mb-10">
            <img src={lightLogo} alt="Light" className="h-12 w-auto" />
          </div>

          {success ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </div>
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">Password Updated!</h1>
              <p className="text-slate-500 text-sm mb-6">
                Your password has been changed successfully. Redirecting you to the login page…
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-[28px] font-display font-bold text-slate-900 mb-1.5">Set a new password</h1>
                <p className="text-slate-500 text-sm">
                  {token
                    ? "Create a strong password for your account."
                    : "No reset token found. Please use the link from your email."}
                </p>
              </div>

              {!token && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Invalid reset link</p>
                    <p className="text-xs text-red-600 mt-1">
                      This link appears to be incomplete. Please use the reset link sent to your email, or{" "}
                      <Link href="/forgot-password" className="underline font-semibold">request a new one</Link>.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setValidationError(""); }}
                      placeholder="Min. 6 characters"
                      className="input-base pl-10 pr-10"
                      disabled={!token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {strength && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: strength.width, background: strength.color }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setValidationError(""); }}
                      placeholder="Repeat your password"
                      className="input-base pl-10 pr-10"
                      disabled={!token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                  )}
                  {confirmPassword && password === confirmPassword && password.length >= 6 && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                    </p>
                  )}
                </div>

                {validationError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{validationError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetMutation.isPending || !token}
                  className="w-full primary-gradient py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resetMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Set New Password
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex w-[45%] bg-[hsl(228,39%,13%)] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <div className="relative flex items-center">
          <img src={lightLogo} alt="Light" className="h-10 w-auto brightness-0 invert" />
        </div>
        <div className="relative space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center mb-6">
            <ShieldCheck className="w-7 h-7 text-indigo-300" />
          </div>
          <h2 className="text-white text-2xl font-bold">Secure Password Reset</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Use a strong password with a mix of uppercase, lowercase, numbers and symbols to protect your account.
          </p>
          <ul className="space-y-2 mt-4">
            {[
              "At least 6 characters long",
              "Mix of uppercase and lowercase",
              "Include numbers and symbols",
              "Never reuse old passwords",
            ].map(tip => (
              <li key={tip} className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <p className="text-slate-500 text-xs">© 2026 Light · Asset Insurance Portal</p>
        </div>
      </div>
    </div>
  );
}
