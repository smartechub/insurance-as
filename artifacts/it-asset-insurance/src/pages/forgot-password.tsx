import { useState } from "react";
import { Link } from "wouter";
import { ShieldCheck, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useForgotPassword } from "@workspace/api-client-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const forgotMutation = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotMutation.mutate({ data: { email } }, {
      onSuccess: () => setSuccess(true)
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        {success ? (
          <div className="py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-500 mb-8">We've sent password reset instructions to {email}</p>
            <Link href="/login" className="inline-flex items-center justify-center w-full py-3.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Reset Password</h2>
            <p className="text-slate-500 mb-8">Enter your email address and we'll send you a link to reset your password.</p>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotMutation.isPending}
                className="w-full primary-gradient py-3.5 rounded-xl font-bold flex justify-center items-center gap-2"
              >
                {forgotMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-8">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
