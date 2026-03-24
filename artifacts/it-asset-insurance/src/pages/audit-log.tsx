import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import {
  Shield, Search, Download, RefreshCw, ChevronLeft, ChevronRight,
  LogIn, LogOut, FileText, Users, File, Eye, Plus, Pencil, Trash2,
  AlertTriangle, Filter, Calendar, Activity, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay } from "date-fns";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ExportRange = "day" | "week" | "month" | "year" | "custom";

const CATEGORY_COLORS: Record<string, string> = {
  AUTH: "bg-blue-100 text-blue-700",
  CLAIMS: "bg-indigo-100 text-indigo-700",
  DOCUMENTS: "bg-amber-100 text-amber-700",
  USERS: "bg-green-100 text-green-700",
  NAVIGATION: "bg-slate-100 text-slate-600",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  LOGIN: <LogIn className="w-3.5 h-3.5" />,
  LOGOUT: <LogOut className="w-3.5 h-3.5" />,
  LOGIN_FAILED: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  CLAIM_VIEWED: <Eye className="w-3.5 h-3.5" />,
  CLAIM_CREATED: <Plus className="w-3.5 h-3.5 text-green-600" />,
  CLAIM_UPDATED: <Pencil className="w-3.5 h-3.5 text-amber-600" />,
  CLAIM_DELETED: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
  CLAIMS_LISTED: <FileText className="w-3.5 h-3.5" />,
  DOCUMENT_UPLOADED: <Plus className="w-3.5 h-3.5 text-green-600" />,
  DOCUMENT_DELETED: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
  USER_CREATED: <Plus className="w-3.5 h-3.5 text-green-600" />,
  USER_UPDATED: <Pencil className="w-3.5 h-3.5 text-amber-600" />,
  USER_DELETED: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
  USERS_LISTED: <Users className="w-3.5 h-3.5" />,
  USER_EXPORTED: <Download className="w-3.5 h-3.5" />,
  USERS_BULK_UPLOADED: <File className="w-3.5 h-3.5" />,
  PASSWORD_RESET_REQUESTED: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  PASSWORD_RESET: <Shield className="w-3.5 h-3.5 text-green-600" />,
  PAGE_VIEW: <Eye className="w-3.5 h-3.5 text-slate-400" />,
};

function actionLabel(action: string) {
  return action.replace(/_/g, " ");
}

interface Log {
  id: number;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  category: string;
  resourceType: string | null;
  resourceId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: Log[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchLogs(params: Record<string, string>): Promise<LogsResponse> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/api/audit-logs?${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [showExport, setShowExport] = useState(false);
  const [exportRange, setExportRange] = useState<ExportRange>("day");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (overrides?: Partial<{ search: string; category: string; page: number; from: string; to: string }>) => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {
      page: String(overrides?.page ?? page),
      limit: "50",
      search: overrides?.search ?? search,
      category: overrides?.category ?? category,
      from: overrides?.from ?? from,
      to: overrides?.to ?? to,
    };
    Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
    try {
      const result = await fetchLogs(params);
      setData(result);
    } catch {
      setError("Could not load audit logs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, category, from, to]);

  const handleSearch = () => { setPage(1); load({ page: 1 }); };
  const handleClear = () => {
    setSearch(""); setCategory(""); setFrom(""); setTo(""); setPage(1);
    load({ search: "", category: "", from: "", to: "", page: 1 });
  };
  const handlePageChange = (p: number) => { setPage(p); load({ page: p }); };

  const doExport = async () => {
    setExporting(true);
    let url = `${API_BASE}/api/audit-logs/export?range=${exportRange}`;
    if (exportRange === "custom") {
      if (!exportFrom || !exportTo) { alert("Please select both start and end dates."); setExporting(false); return; }
      url += `&from=${exportFrom}&to=${exportTo}`;
    }
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `audit-log-${exportRange}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      setShowExport(false);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const quickDate = (range: ExportRange) => {
    const now = new Date();
    if (range === "day") { setFrom(format(startOfDay(now), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    else if (range === "week") { setFrom(format(subWeeks(now, 1), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    else if (range === "month") { setFrom(format(subMonths(now, 1), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    else if (range === "year") { setFrom(format(subYears(now, 1), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    else { setFrom(""); setTo(""); }
    setPage(1);
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-600" />
              Audit Log
            </h1>
            <p className="text-sm text-slate-500 mt-1">Full activity history — every action, every click, every change.</p>
          </div>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Log
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Search user, action, description..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setPage(1); load({ category: e.target.value, page: 1 }); }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              >
                <option value="">All Categories</option>
                <option value="AUTH">Auth</option>
                <option value="CLAIMS">Claims</option>
                <option value="DOCUMENTS">Documents</option>
                <option value="USERS">Users</option>
                <option value="NAVIGATION">Navigation</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">From Date</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">To Date</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSearch}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
              <button onClick={() => load()}
                className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors" title="Refresh">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              {(search || category || from || to) && (
                <button onClick={handleClear}
                  className="p-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Clear filters">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Quick date ranges */}
            <div className="flex gap-1.5 flex-wrap">
              {([["Today", "day"], ["This Week", "week"], ["This Month", "month"], ["This Year", "year"]] as [string, ExportRange][]).map(([label, range]) => (
                <button key={range} onClick={() => { quickDate(range); setTimeout(() => { load({ from: undefined, to: undefined }); }, 0); }}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors text-slate-600">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Initial state */}
        {!data && !loading && !error && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Click <strong>Filter</strong> or press Enter to load audit logs.</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading audit logs...</p>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{data.total.toLocaleString()} {data.total === 1 ? "entry" : "entries"} found</span>
              <span className="text-slate-400">Page {data.page} of {data.totalPages || 1}</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {data.logs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">No audit logs found for the selected filters.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <div className="px-4 py-3 flex items-start gap-3">
                        {/* Icon */}
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-500">
                          {ACTION_ICONS[log.action] ?? <Activity className="w-3.5 h-3.5" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", CATEGORY_COLORS[log.category] ?? "bg-slate-100 text-slate-600")}>
                              {log.category}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">{actionLabel(log.action)}</span>
                            {log.resourceType && log.resourceId && (
                              <span className="text-xs text-slate-400">{log.resourceType} #{log.resourceId}</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5 truncate">{log.description}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {log.userName && (
                              <span className="text-xs text-slate-400">
                                <span className="font-medium text-slate-600">{log.userName}</span>
                                {log.userRole && <span className="ml-1 text-[10px] text-slate-400">({log.userRole})</span>}
                              </span>
                            )}
                            {log.ipAddress && <span className="text-xs text-slate-400">{log.ipAddress}</span>}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-medium text-slate-700">{format(new Date(log.createdAt), "HH:mm:ss")}</div>
                          <div className="text-[10px] text-slate-400">{format(new Date(log.createdAt), "MMM d, yyyy")}</div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expandedId === log.id && (
                        <div className="px-4 pb-4 ml-10 border-t border-slate-100 mt-0 pt-3 bg-slate-50">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div><span className="text-slate-400">Log ID</span><div className="font-mono text-slate-700 mt-0.5">#{log.id}</div></div>
                            <div><span className="text-slate-400">User Email</span><div className="text-slate-700 mt-0.5">{log.userEmail ?? "—"}</div></div>
                            <div><span className="text-slate-400">User Agent</span><div className="text-slate-700 mt-0.5 truncate">{log.userAgent ? log.userAgent.slice(0, 60) + (log.userAgent.length > 60 ? "…" : "") : "—"}</div></div>
                            <div><span className="text-slate-400">IP Address</span><div className="font-mono text-slate-700 mt-0.5">{log.ipAddress ?? "—"}</div></div>
                            <div><span className="text-slate-400">Full Timestamp</span><div className="text-slate-700 mt-0.5">{format(new Date(log.createdAt), "PPpp")}</div></div>
                            {log.metadata && (
                              <div className="col-span-2 md:col-span-3">
                                <span className="text-slate-400">Metadata</span>
                                <pre className="mt-0.5 text-slate-700 bg-white border border-slate-200 rounded p-2 text-[10px] overflow-auto max-h-32">{JSON.stringify(log.metadata, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
                  const p = data.totalPages <= 7 ? i + 1 : i + Math.max(1, Math.min(data.page - 3, data.totalPages - 6));
                  return (
                    <button key={p} onClick={() => handlePageChange(p)}
                      className={cn("w-9 h-9 rounded-lg text-sm font-medium transition-colors", p === data.page ? "bg-indigo-600 text-white" : "border border-slate-200 hover:bg-slate-50 text-slate-600")}>
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-600" />
                  Export Audit Log
                </h2>
                <button onClick={() => setShowExport(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([["Today", "day"], ["Last 7 Days", "week"], ["Last 30 Days", "month"], ["Last Year", "year"], ["Custom Range", "custom"]] as [string, ExportRange][]).map(([label, range]) => (
                      <button
                        key={range}
                        onClick={() => setExportRange(range)}
                        className={cn(
                          "px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left flex items-center gap-2",
                          exportRange === range
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {exportRange === "custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
                      <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
                      <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400">Exports as a CSV file containing all audit log entries for the selected period.</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowExport(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={doExport} disabled={exporting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {exporting ? "Exporting..." : "Download CSV"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AppLayout>
  );
}
