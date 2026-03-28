import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Settings, Loader2, Tag, Cpu, Users2, Activity,
  Mail, Eye, EyeOff, FlaskConical, CheckCircle, XCircle,
  ToggleLeft, ToggleRight, Pencil, Check, X, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Option { id: number; value: string; }

interface CategoryConfig {
  key: string; label: string; description: string;
  icon: React.ReactNode; accent: string; dot: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "assetTypes", label: "Asset Types",
    description: "Types of IT assets used in claim forms",
    icon: <Cpu className="w-4 h-4" />, accent: "indigo", dot: "bg-indigo-500",
  },
  {
    key: "effectedParts", label: "Affected Parts",
    description: "Parts damaged or affected in a claim",
    icon: <Tag className="w-4 h-4" />, accent: "orange", dot: "bg-orange-500",
  },
  {
    key: "departments", label: "Departments",
    description: "Company departments for filtering",
    icon: <Users2 className="w-4 h-4" />, accent: "emerald", dot: "bg-emerald-500",
  },
  {
    key: "claimStatuses", label: "Claim Statuses",
    description: "Status values for the claims workflow",
    icon: <Activity className="w-4 h-4" />, accent: "violet", dot: "bg-violet-500",
  },
];

const ACCENT: Record<string, { nav: string; iconBg: string; iconText: string; add: string; chip: string; chipText: string; ring: string }> = {
  indigo:  { nav: "bg-indigo-50 text-indigo-700 border-indigo-200",  iconBg: "bg-indigo-100", iconText: "text-indigo-600", add: "bg-indigo-600 hover:bg-indigo-700",  chip: "bg-indigo-50 border-indigo-200",  chipText: "text-indigo-800", ring: "focus:ring-indigo-400" },
  orange:  { nav: "bg-orange-50 text-orange-700 border-orange-200",  iconBg: "bg-orange-100", iconText: "text-orange-600", add: "bg-orange-500 hover:bg-orange-600",  chip: "bg-orange-50 border-orange-200",  chipText: "text-orange-800", ring: "focus:ring-orange-400" },
  emerald: { nav: "bg-emerald-50 text-emerald-700 border-emerald-200", iconBg: "bg-emerald-100", iconText: "text-emerald-600", add: "bg-emerald-600 hover:bg-emerald-700", chip: "bg-emerald-50 border-emerald-200", chipText: "text-emerald-800", ring: "focus:ring-emerald-400" },
  violet:  { nav: "bg-violet-50 text-violet-700 border-violet-200",  iconBg: "bg-violet-100", iconText: "text-violet-600", add: "bg-violet-600 hover:bg-violet-700",  chip: "bg-violet-50 border-violet-200",  chipText: "text-violet-800", ring: "focus:ring-violet-400" },
};

function DropdownOptionsPanel({
  optionsMap, loading, onAdd, onEdit, onDelete,
}: {
  optionsMap: Record<string, Option[]>;
  loading: boolean;
  onAdd: (cat: string, val: string) => Promise<void>;
  onEdit: (cat: string, id: number, val: string) => Promise<void>;
  onDelete: (cat: string, id: number, val: string) => Promise<void>;
}) {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].key);
  const category = CATEGORIES.find((c) => c.key === activeCat)!;
  const options = optionsMap[activeCat] ?? [];
  const ac = ACCENT[category.accent];

  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewValue("");
    setEditingId(null);
    setEditValue("");
  }, [activeCat]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    try { await onAdd(activeCat, newValue.trim()); setNewValue(""); addInputRef.current?.focus(); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: number, val: string) => {
    setDeletingId(id);
    try { await onDelete(activeCat, id, val); }
    finally { setDeletingId(null); }
  };

  const startEdit = (opt: Option) => { setEditingId(opt.id); setEditValue(opt.value); };
  const cancelEdit = () => { setEditingId(null); setEditValue(""); };

  const handleSaveEdit = async (id: number) => {
    if (!editValue.trim()) return;
    setSavingId(id);
    try { await onEdit(activeCat, id, editValue.trim()); setEditingId(null); setEditValue(""); }
    finally { setSavingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="flex gap-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ minHeight: 480 }}>
      {/* Left nav */}
      <nav className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col py-2">
        {CATEGORIES.map((cat) => {
          const count = (optionsMap[cat.key] ?? []).length;
          const isActive = cat.key === activeCat;
          const a = ACCENT[cat.accent];
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-left transition-all border-r-2",
                isActive
                  ? `border-r-current ${a.nav} border border-r-2`
                  : "border-r-transparent text-slate-600 hover:bg-slate-100 border-transparent"
              )}
            >
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isActive ? a.iconBg : "bg-slate-200", isActive ? a.iconText : "text-slate-500")}>
                {cat.icon}
              </div>
              <span className="text-sm font-semibold flex-1 leading-tight">{cat.label}</span>
              <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", isActive ? a.iconBg + " " + a.iconText : "bg-slate-200 text-slate-500")}>
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Panel header */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", ac.iconBg, ac.iconText)}>
              {category.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{category.label}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{category.description}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 px-6 py-5 overflow-y-auto">
          {options.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3", ac.iconBg, ac.iconText)}>
                {category.icon}
              </div>
              <p className="text-sm font-semibold text-slate-500">No {category.label.toLowerCase()} yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your first option below</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {options.map((opt) =>
                editingId === opt.id ? (
                  <div key={opt.id} className={cn("flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl border text-sm font-semibold", ac.chip, ac.chipText)}>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(opt.id); if (e.key === "Escape") cancelEdit(); }}
                      className={cn("bg-transparent border-b border-current outline-none w-28 text-sm font-semibold", ac.chipText)}
                    />
                    <button
                      onClick={() => handleSaveEdit(opt.id)}
                      disabled={savingId === opt.id || !editValue.trim()}
                      className="p-0.5 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                    >
                      {savingId === opt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={cancelEdit} className="p-0.5 rounded text-slate-400 hover:bg-slate-200 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    key={opt.id}
                    className={cn("group flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border text-sm font-semibold transition-all", ac.chip, ac.chipText)}
                  >
                    <span>{opt.value}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => startEdit(opt)}
                        disabled={deletingId === opt.id}
                        className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-white/80 transition-colors disabled:opacity-40"
                        title={`Edit "${opt.value}"`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(opt.id, opt.value)}
                        disabled={deletingId === opt.id}
                        className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-white/80 transition-colors disabled:opacity-40"
                        title={`Remove "${opt.value}"`}
                      >
                        {deletingId === opt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Add input pinned to bottom */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex gap-2">
            <input
              ref={addInputRef}
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`Add new ${category.label.toLowerCase().replace(/s$/, "")}…`}
              className="flex-1 input-base text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newValue.trim()}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                ac.add
              )}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SmtpForm {
  host: string; port: string; secure: boolean;
  username: string; password: string;
  fromName: string; fromEmail: string;
  enabled: boolean; testRecipient: string;
}

function SmtpConfigPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const [form, setForm] = useState<SmtpForm>({
    host: "smtppro.zoho.in", port: "465", secure: true,
    username: "no_reply@lightfinance.com", password: "",
    fromName: "Light Finance", fromEmail: "no_reply@lightfinance.com",
    enabled: false, testRecipient: "",
  });

  useEffect(() => {
    fetch("/api/smtp", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setForm((f) => ({
          ...f, host: data.host ?? f.host, port: String(data.port ?? f.port),
          secure: data.secure ?? f.secure, username: data.username ?? f.username,
          password: data.password ?? "", fromName: data.fromName ?? f.fromName,
          fromEmail: data.fromEmail ?? f.fromEmail, enabled: data.enabled ?? false,
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof SmtpForm, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setTestResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/smtp", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "SMTP configuration saved" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save SMTP configuration" });
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!form.testRecipient) { toast({ variant: "destructive", title: "Enter a test recipient email first" }); return; }
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch("/api/smtp/test", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      });
      const result = await res.json();
      setTestResult(result);
      if (result.success) toast({ title: "Test email sent successfully!" });
      else toast({ variant: "destructive", title: "Test failed", description: result.error });
    } catch { toast({ variant: "destructive", title: "Test request failed" }); }
    finally { setTesting(false); }
  };

  if (loading) return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-64 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">SMTP Email Configuration</h3>
            <p className="text-xs text-slate-400 mt-0.5">Send notifications on claim create, update, and delete</p>
          </div>
        </div>
        <button
          onClick={() => handleChange("enabled", !form.enabled)}
          className="flex items-center gap-2 transition-colors"
          title={form.enabled ? "Disable notifications" : "Enable notifications"}
        >
          <span className={cn("text-xs font-semibold", form.enabled ? "text-emerald-600" : "text-slate-400")}>
            {form.enabled ? "Enabled" : "Disabled"}
          </span>
          {form.enabled
            ? <ToggleRight className="w-7 h-7 text-emerald-500" />
            : <ToggleLeft className="w-7 h-7 text-slate-300" />}
        </button>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        {/* Server Settings */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Server Settings</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">SMTP Host</label>
              <input type="text" value={form.host} onChange={(e) => handleChange("host", e.target.value)}
                placeholder="smtppro.zoho.in" className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Port</label>
              <input type="number" value={form.port} onChange={(e) => handleChange("port", e.target.value)}
                placeholder="465" className="input-base text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Security</label>
              <select value={form.secure ? "true" : "false"} onChange={(e) => handleChange("secure", e.target.value === "true")}
                className="input-base text-sm appearance-none">
                <option value="true">SSL / TLS (Secure)</option>
                <option value="false">STARTTLS / None</option>
              </select>
            </div>
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2">Authentication</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Username / Email</label>
              <input type="text" value={form.username} onChange={(e) => handleChange("username", e.target.value)}
                placeholder="your@email.com" className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="••••••••" className="input-base text-sm pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sender + Test */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sender Identity</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">From Name</label>
              <input type="text" value={form.fromName} onChange={(e) => handleChange("fromName", e.target.value)}
                placeholder="Light Finance" className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">From Email</label>
              <input type="email" value={form.fromEmail} onChange={(e) => handleChange("fromEmail", e.target.value)}
                placeholder="no_reply@example.com" className="input-base text-sm" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Send Test Email</p>
            <div className="flex gap-2">
              <input type="email" value={form.testRecipient}
                onChange={(e) => handleChange("testRecipient", e.target.value)}
                placeholder="recipient@example.com" className="flex-1 input-base text-sm" />
              <button onClick={handleTest} disabled={testing || !form.testRecipient}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                Test
              </button>
            </div>
            {testResult && (
              <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border",
                testResult.success ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                {testResult.success
                  ? <><CheckCircle className="w-4 h-4 shrink-0" /> Test email sent!</>
                  : <><XCircle className="w-4 h-4 shrink-0" /> {testResult.error ?? "Failed to send"}</>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end px-6 pb-5">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}

type Tab = "options" | "email";

export default function SettingsPage() {
  const { toast } = useToast();
  const [optionsMap, setOptionsMap] = useState<Record<string, Option[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("options");

  useEffect(() => {
    fetch("/api/settings", { credentials: "include" })
      .then((r) => r.ok ? r.json() : {})
      .then((data: Record<string, Option[]>) => setOptionsMap(data))
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (category: string, value: string) => {
    const res = await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ category, value }),
    });
    if (res.status === 409) { toast({ variant: "destructive", title: "Already exists", description: `"${value}" already exists.` }); return; }
    if (!res.ok) { toast({ variant: "destructive", title: "Failed to add option" }); return; }
    const newOpt: Option & { category: string } = await res.json();
    setOptionsMap((prev) => ({ ...prev, [category]: [...(prev[category] ?? []), { id: newOpt.id, value: newOpt.value }] }));
    toast({ title: "Added", description: `"${value}" added.` });
  };

  const handleEdit = async (category: string, id: number, value: string) => {
    const res = await fetch(`/api/settings/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ value }),
    });
    if (res.status === 409) { toast({ variant: "destructive", title: "Already exists", description: `"${value}" already exists.` }); throw new Error("duplicate"); }
    if (!res.ok) { toast({ variant: "destructive", title: "Failed to update" }); throw new Error("failed"); }
    const updated: Option = await res.json();
    setOptionsMap((prev) => ({ ...prev, [category]: (prev[category] ?? []).map((o) => o.id === id ? { id: updated.id, value: updated.value } : o) }));
    toast({ title: "Updated", description: `Renamed to "${value}".` });
  };

  const handleDelete = async (category: string, id: number, value: string) => {
    const res = await fetch(`/api/settings/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { toast({ variant: "destructive", title: "Failed to remove" }); return; }
    setOptionsMap((prev) => ({ ...prev, [category]: (prev[category] ?? []).filter((o) => o.id !== id) }));
    toast({ title: "Removed", description: `"${value}" removed.` });
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "options", label: "Dropdown Options", icon: <Tag className="w-4 h-4" /> },
    { key: "email", label: "Email (SMTP)", icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 leading-none">Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage dropdown options and email notifications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "options" && (
        <DropdownOptionsPanel
          optionsMap={optionsMap}
          loading={loading}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      {activeTab === "email" && <SmtpConfigPanel />}
    </AppLayout>
  );
}
