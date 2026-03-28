import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Shield,
  Settings,
  BookOpen,
  Database,
} from "lucide-react";
import lightLogo from "@assets/Light_Logo_1774345301483.png";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Claims", href: "/claims", icon: FileText },
  { label: "New Claim", href: "/claims/new", icon: PlusCircle },
  { label: "Asset List", href: "/assets", icon: Database },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/claims": "Claims Management",
  "/claims/new": "Create Claim",
  "/users": "User Management",
  "/audit-log": "Audit Log",
  "/settings": "Settings",
  "/policies": "Policy Management",
  "/assets": "Asset List",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe({ query: { retry: false } });
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isError || (!isLoading && !user)) {
      queryClient.removeQueries();
      setLocation("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, isLoading, user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <img src={lightLogo} alt="Light" className="h-12 w-auto" />
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-2 h-2 rounded-full bg-indigo-400"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    );
  }

  const navItems = [...NAV];
  if (user?.role === "admin") {
    navItems.push({ label: "Policies", href: "/policies", icon: BookOpen });
    navItems.push({ label: "Users", href: "/users", icon: Users });
    navItems.push({ label: "Audit Log", href: "/audit-log", icon: Shield });
    navItems.push({ label: "Settings", href: "/settings", icon: Settings });
  }

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        toast({ title: "Logged out successfully" });
        setLocation("/login");
      },
    });
  };

  const pageTitle = PAGE_TITLES[location] ?? (location.startsWith("/claims/") ? "Claim Details" : "Light");
  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const activeHref = navItems
    .filter((item) =>
      item.href === "/"
        ? location === "/"
        : location === item.href || location.startsWith(item.href + "/")
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
        "bg-white border-r border-slate-200",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center">
            <img src={lightLogo} alt="Light" className="h-9 w-auto" />
          </div>
          <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Main Menu</div>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "sidebar-item",
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200/50"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm font-display shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{user?.name}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-display font-bold text-slate-900 text-base leading-none">{pageTitle}</h2>
              <div className="text-xs text-slate-400 mt-0.5 hidden sm:block">IT Asset Insurance Management</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm font-display">
                {initials}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-slate-800 leading-none">{user?.name}</div>
                <div className="text-xs text-slate-400 capitalize mt-0.5">{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="p-6 md:p-8 max-w-7xl mx-auto w-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
