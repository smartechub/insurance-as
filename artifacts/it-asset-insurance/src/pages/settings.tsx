import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Settings, Loader2, Tag, Cpu, Users2, Activity } from "lucide-react";

interface Option {
  id: number;
  value: string;
}

interface CategoryConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "assetTypes",
    label: "Asset Types",
    description: "Types of IT assets covered (used in claim forms)",
    icon: <Cpu className="w-5 h-5" />,
    color: "indigo",
  },
  {
    key: "effectedParts",
    label: "Affected Parts",
    description: "Parts that can be damaged or affected in a claim",
    icon: <Tag className="w-5 h-5" />,
    color: "orange",
  },
  {
    key: "departments",
    label: "Departments",
    description: "Company departments for filtering and reporting",
    icon: <Users2 className="w-5 h-5" />,
    color: "green",
  },
  {
    key: "claimStatuses",
    label: "Claim Statuses",
    description: "Status values used throughout the claims workflow",
    icon: <Activity className="w-5 h-5" />,
    color: "violet",
  },
];

const COLOR_MAP: Record<string, { bg: string; iconBg: string; iconText: string; badge: string; badgeText: string; addBtn: string; border: string }> = {
  indigo: {
    bg: "bg-indigo-50/60",
    iconBg: "bg-indigo-100",
    iconText: "text-indigo-600",
    badge: "bg-indigo-100",
    badgeText: "text-indigo-700",
    addBtn: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500",
    border: "border-indigo-200",
  },
  orange: {
    bg: "bg-orange-50/60",
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    badge: "bg-orange-100",
    badgeText: "text-orange-700",
    addBtn: "bg-orange-500 hover:bg-orange-600 focus:ring-orange-400",
    border: "border-orange-200",
  },
  green: {
    bg: "bg-emerald-50/60",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    badge: "bg-emerald-100",
    badgeText: "text-emerald-700",
    addBtn: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
    border: "border-emerald-200",
  },
  violet: {
    bg: "bg-violet-50/60",
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
    badge: "bg-violet-100",
    badgeText: "text-violet-700",
    addBtn: "bg-violet-600 hover:bg-violet-700 focus:ring-violet-500",
    border: "border-violet-200",
  },
};

function CategoryCard({ category, options, onAdd, onDelete }: {
  category: CategoryConfig;
  options: Option[];
  onAdd: (category: string, value: string) => Promise<void>;
  onDelete: (category: string, id: number, value: string) => Promise<void>;
}) {
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const colors = COLOR_MAP[category.color];

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    try {
      await onAdd(category.key, newValue.trim());
      setNewValue("");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number, value: string) => {
    setDeletingId(id);
    try {
      await onDelete(category.key, id, value);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-5 ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.iconBg} ${colors.iconText} flex items-center justify-center shrink-0`}>
            {category.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{category.label}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge} ${colors.badgeText}`}>
                {options.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{category.description}</p>
          </div>
        </div>
      </div>

      {/* Options List */}
      <div className="px-6 py-4">
        {options.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">No options yet. Add one below.</div>
        ) : (
          <div className="space-y-1.5 mb-4">
            {options.map((opt) => (
              <div
                key={opt.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 group transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${colors.iconBg} ${colors.iconText} shrink-0`}
                    style={{ backgroundColor: "currentColor" }}
                  />
                  <span className="text-sm font-medium text-slate-800">{opt.value}</span>
                </div>
                <button
                  onClick={() => handleDelete(opt.id, opt.value)}
                  disabled={deletingId === opt.id}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  title={`Remove "${opt.value}"`}
                >
                  {deletingId === opt.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new option */}
        <div className="flex gap-2 mt-3">
          <input
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${colors.addBtn}`}
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAdd = async (category: string, value: string) => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ category, value }),
    });
    if (res.status === 409) {
      toast({ variant: "destructive", title: "Already exists", description: `"${value}" already exists in this list.` });
      return;
    }
    if (!res.ok) {
      toast({ variant: "destructive", title: "Failed to add option" });
      return;
    }
    const newOption: Option & { category: string } = await res.json();
    setOptionsMap((prev) => ({
      ...prev,
      [category]: [...(prev[category] ?? []), { id: newOption.id, value: newOption.value }],
    }));
    toast({ title: "Option added", description: `"${value}" added to ${category}.` });
  };

  const handleDelete = async (category: string, id: number, value: string) => {
    const res = await fetch(`/api/settings/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Failed to remove option" });
      return;
    }
    setOptionsMap((prev) => ({
      ...prev,
      [category]: (prev[category] ?? []).filter((o) => o.id !== id),
    }));
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
        <p className="text-sm text-slate-500 ml-12">
          Manage the dropdown options available throughout the application.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.key}
              category={cat}
              options={optionsMap[cat.key] ?? []}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
