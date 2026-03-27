import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Settings, Loader2, Tag, Cpu, Users2, Activity, Mail, Eye, EyeOff, FlaskConical, CheckCircle, XCircle, ToggleLeft, ToggleRight, Pencil, Check, X } from "lucide-react";

interface Option { id: number; value: string; }

interface CategoryConfig {
  key: string; label: string; description: string;
  icon: React.ReactNode; color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: "assetTypes", label: "Asset Types", description: "Types of IT assets covered (used in claim forms)", icon: <Cpu className="w-5 h-5" />, color: "indigo" },
  { key: "effectedParts", label: "Affected Parts", description: "Parts that can be damaged or affected in a claim", icon: <Tag className="w-5 h-5" />, color: "orange" },
  { key: "departments", label: "Departments", description: "Company departments for filtering and reporting", icon: <Users2 className="w-5 h-5" />, color: "green" },
  { key: "claimStatuses", label: "Claim Statuses", description: "Status values used throughout the claims workflow", icon: <Activity className="w-5 h-5" />, color: "violet" },
];

const COLOR_MAP: Record<string, { bg: string; iconBg: string; iconText: string; badge: string; badgeText: string; addBtn: string; border: string }> = {
  indigo: { bg: "bg-indigo-50/60", iconBg: "bg-indigo-100", iconText: "text-indigo-600", badge: "bg-indigo-100", badgeText: "text-indigo-700", addBtn: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500", border: "border-indigo-200" },
  orange: { bg: "bg-orange-50/60", iconBg: "bg-orange-100", iconText: "text-orange-600", badge: "bg-orange-100", badgeText: "text-orange-700", addBtn: "bg-orange-500 hover:bg-orange-600 focus:ring-orange-400", border: "border-orange-200" },
  green: { bg: "bg-emerald-50/60", iconBg: "bg-emerald-100", iconText: "text-emerald-600", badge: "bg-emerald-100", badgeText: "text-emerald-700", addBtn: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500", border: "border-emerald-200" },
  violet: { bg: "bg-violet-50/60", iconBg: "bg-violet-100", iconText: "text-violet-600", badge: "bg-violet-100", badgeText: "text-violet-700", addBtn: "bg-violet-600 hover:bg-violet-700 focus:ring-violet-500", border: "border-violet-200" },
};

function CategoryCard({ category, options, onAdd, onEdit, onDelete }: {
  category: CategoryConfig; options: Option[];
  onAdd: (category: string, value: string) => Promise<void>;
  onEdit: (category: string, id: number, value: string) => Promise<void>;
  onDelete: (category: string, id: number, value: string) => Promise<void>;
}) {
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const colors = COLOR_MAP[category.color];

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    try { await onAdd(category.key, newValue.trim()); setNewValue(""); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: number, value: string) => {
    setDeletingId(id);
    try { await onDelete(category.key, id, value); }
    finally { setDeletingId(null); }
  };

  const startEdit = (opt: Option) => {
    setEditingId(opt.id);
    setEditValue(opt.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveEdit = async (id: number) => {
    if (!editValue.trim()) return;
    setSavingId(id);
    try {
      await onEdit(category.key, id, editValue.trim());
      setEditingId(null);
      setEditValue("");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-6 py-5 ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.iconBg} ${colors.iconText} flex items-center justify-center shrink-0`}>{category.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{category.label}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge} ${colors.badgeText}`}>{options.length}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{category.description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-4">
        {options.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">No options yet. Add one below.</div>
        ) : (
          <div className="space-y-1.5 mb-4">
            {options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 group transition-colors">
                {editingId === opt.id ? (
                  <>
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.iconBg} shrink-0`} />
                    <input
                      type="text"
                      value={editValue}
                      autoFocus
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(opt.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => handleSaveEdit(opt.id)}
                      disabled={savingId === opt.id || !editValue.trim()}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-50"
                      title="Save"
                    >
                      {savingId === opt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.iconBg} shrink-0`} />
                    <span className="text-sm font-medium text-slate-800 flex-1">{opt.value}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => startEdit(opt)}
                        disabled={deletingId === opt.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50"
                        title={`Edit "${opt.value}"`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(opt.id, opt.value)}
                        disabled={deletingId === opt.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                        title={`Remove "${opt.value}"`}
                      >
                        {deletingId === opt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={`Add new ${category.label.toLowerCase().replace(/s$/, "")}…`}
            className="flex-1 input-base text-sm" />
          <button onClick={handleAdd} disabled={adding || !newValue.trim()}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${colors.addBtn}`}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
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
        if (data) {
          setForm((f) => ({
            ...f,
            host: data.host ?? f.host, port: String(data.port ?? f.port),
            secure: data.secure ?? f.secure, username: data.username ?? f.username,
            password: data.password ?? "", fromName: data.fromName ?? f.fromName,
            fromEmail: data.fromEmail ?? f.fromEmail, enabled: data.enabled ?? false,
          }));
        }
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
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "SMTP configuration saved" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save SMTP configuration" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!form.testRecipient) {
      toast({ variant: "destructive", title: "Enter a test recipient email first" });
      return;
    }
    setTesting(true);
    setTestResult(null);
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
    } catch {
      toast({ variant: "destructive", title: "Test request failed" });
    } finally {
      setTesting(false);
    }
  };

  const field = (label: string, fieldKey: keyof SmtpForm, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={String(form[fieldKey])} placeholder={placeholder}
        onChange={(e) => handleChange(fieldKey, e.target.value)}
        className="input-base text-sm" />
    </div>
  );

  if (loading) return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-blue-50/60 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">SMTP Email Configuration</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${form.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {form.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Auto-send email notifications on claim create, update, and delete</p>
            </div>
          </div>
          <button onClick={() => handleChange("enabled", !form.enabled)}
            className={`transition-colors ${form.enabled ? "text-emerald-600" : "text-slate-300"}`}
            title={form.enabled ? "Disable notifications" : "Enable notifications"}>
            {form.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Server Settings</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {field("SMTP Host", "host", "text", "e.g. smtppro.zoho.in")}
            {field("Port", "port", "number", "465")}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Security</label>
              <select value={form.secure ? "true" : "false"} onChange={(e) => handleChange("secure", e.target.value === "true")}
                className="input-base text-sm appearance-none">
                <option value="true">SSL / TLS (Secure)</option>
                <option value="false">STARTTLS / None</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Authentication</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Username / Email", "username", "text", "your@email.com")}
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

        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sender Identity</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("From Name", "fromName", "text", "Light Finance")}
            {field("From Email", "fromEmail", "email", "no_reply@lightfinance.com")}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Send Test Email</div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Test Recipient</label>
              <input type="email" value={form.testRecipient}
                onChange={(e) => handleChange("testRecipient", e.target.value)}
                placeholder="recipient@example.com" className="input-base text-sm" />
            </div>
            <button onClick={handleTest} disabled={testing || !form.testRecipient}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              Send Test
            </button>
          </div>

          {testResult && (
            <div className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${testResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {testResult.success
                ? <><CheckCircle className="w-4 h-4 shrink-0" /> Test email sent successfully!</>
                : <><XCircle className="w-4 h-4 shrink-0" /> {testResult.error ?? "Failed to send test email"}</>
              }
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [optionsMap, setOptionsMap] = useState<Record<string, Option[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load settings");
      const data: Record<string, Option[]> = await res.json();
      setOptionsMap(data);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleAdd = async (category: string, value: string) => {
    const res = await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ category, value }),
    });
    if (res.status === 409) {
      toast({ variant: "destructive", title: "Already exists", description: `"${value}" already exists in this list.` });
      return;
    }
    if (!res.ok) { toast({ variant: "destructive", title: "Failed to add option" }); return; }
    const newOption: Option & { category: string } = await res.json();
    setOptionsMap((prev) => ({ ...prev, [category]: [...(prev[category] ?? []), { id: newOption.id, value: newOption.value }] }));
    toast({ title: "Option added", description: `"${value}" added.` });
  };

  const handleEdit = async (category: string, id: number, value: string) => {
    const res = await fetch(`/api/settings/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ value }),
    });
    if (res.status === 409) {
      toast({ variant: "destructive", title: "Already exists", description: `"${value}" already exists in this list.` });
      throw new Error("duplicate");
    }
    if (!res.ok) { toast({ variant: "destructive", title: "Failed to update option" }); throw new Error("failed"); }
    const updated: Option = await res.json();
    setOptionsMap((prev) => ({
      ...prev,
      [category]: (prev[category] ?? []).map((o) => o.id === id ? { id: updated.id, value: updated.value } : o),
    }));
    toast({ title: "Option updated", description: `Renamed to "${value}".` });
  };

  const handleDelete = async (category: string, id: number, value: string) => {
    const res = await fetch(`/api/settings/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { toast({ variant: "destructive", title: "Failed to remove option" }); return; }
    setOptionsMap((prev) => ({ ...prev, [category]: (prev[category] ?? []).filter((o) => o.id !== id) }));
    toast({ title: "Option removed", description: `"${value}" removed.` });
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Settings</h1>
        </div>
        <p className="text-sm text-slate-500 ml-12">Manage dropdown options and email notification settings.</p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Email Notifications</h2>
          <SmtpConfigPanel />
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Dropdown Options</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {CATEGORIES.map((cat) => (
                <CategoryCard key={cat.key} category={cat}
                  options={optionsMap[cat.key] ?? []}
                  onAdd={handleAdd} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
