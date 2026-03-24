import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import lightLogo from "@assets/Light_Logo_1774345301483.png";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading, isError: isUserError } = useGetMe({ query: { retry: false } });
  const loginMutation = useLogin();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user && !isUserLoading && !isUserError) setLocation("/");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isUserLoading, isUserError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: () => setLocation("/"),
        onError: () =>
          toast({ variant: "destructive", title: "Invalid credentials", description: "Please check your email and password." }),
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          {/* Brand */}
          <div className="flex items-center mb-10">
            <img src={lightLogo} alt="Light" className="h-12 w-auto" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[28px] font-display font-bold text-slate-900 mb-1.5">Sign in to your account</h1>
            <p className="text-slate-500 text-sm">Enter your credentials to access the insurance portal.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-base pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full primary-gradient py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl bg-slate-100 border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Demo Credentials</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Admin</span>
                <span className="font-mono text-slate-500">admin@company.com / admin123</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">User</span>
                <span className="font-mono text-slate-500">john@company.com / user123</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex w-[45%] bg-[hsl(228,39%,13%)] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-800/10 blur-3xl" />
        </div>

        {/* Top logo */}
        <div className="relative flex items-center">
          <img src={lightLogo} alt="Light" className="h-10 w-auto brightness-0 invert" />
        </div>

        {/* Feature list */}
        <div className="relative space-y-6">
          {[
            { title: "Claim Management", desc: "Create, track, and manage IT asset insurance claims end-to-end." },
            { title: "Document Handling", desc: "Securely upload invoices, photos, and supporting documents." },
            { title: "Analytics Dashboard", desc: "Real-time metrics and visual analytics for decision-making." },
            { title: "Role-based Access", desc: "Granular permissions for admins and employees." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
              className="flex gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm mb-0.5">{f.title}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom tag */}
        <div className="relative">
          <p className="text-slate-500 text-xs">© 2026 Light · Asset Insurance Portal</p>
        </div>
      </div>
    </div>
  );
}
