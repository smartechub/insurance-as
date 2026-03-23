import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { retry: false } });
  const loginMutation = useLogin();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user && !isUserLoading) {
      setLocation("/");
    }
  }, [user, isUserLoading, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: () => {
          toast({ title: "Welcome back!", description: "Successfully logged in." });
          setLocation("/");
        },
        onError: (error) => {
          toast({ 
            variant: "destructive", 
            title: "Login failed", 
            description: error.message || "Invalid credentials." 
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex w-full bg-white selection:bg-primary/20">
      {/* Left side form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 sm:p-12 relative z-10 bg-white">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-primary/30">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="text-3xl font-display font-bold tracking-tight text-slate-900">
                AssetGuard
              </span>
            </div>

            <div className="mb-8">
              <h1 className="text-4xl font-display font-bold text-slate-900 mb-2">Welcome back</h1>
              <p className="text-slate-500 text-lg">Enter your details to access the portal.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-indigo-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full flex items-center justify-center gap-2 primary-gradient py-4 rounded-xl text-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Right side image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10" />
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Abstract geometric design"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute bottom-12 left-12 right-12 z-20">
          <div className="glass-card p-8 rounded-3xl backdrop-blur-xl border border-white/20 bg-white/10">
            <h2 className="text-3xl font-display font-bold text-white mb-3">Enterprise Asset Protection</h2>
            <p className="text-indigo-100 text-lg">Streamlined claim management, real-time tracking, and comprehensive document handling for your entire IT infrastructure.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
