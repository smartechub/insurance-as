import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Loader2, Search, X, Database, ChevronLeft, ChevronRight,
  AlertCircle, Download, ChevronsLeft, ChevronsRight, SlidersHorizontal, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Asset {
  id: number;
  srNo?: string;
  assetNo?: string;
  inventoryNo?: string;
  assetDescription?: string;
  assetType?: string;
  assetSubType?: string;
  plant?: string;
  condition?: string;
  model?: string;
  processor?: string;
  ram?: string;
  hdd?: string;
  itSerialNo?: string;
  lcdSerialNo?: string;
  assetClass?: string;
  assetClassShortName?: string;
  sbu?: string;
  quantity?: string;
  costLocal?: string;
  nbvLocal?: string;
  capitalizationDate?: string;
  assetCriticality?: string;
}

interface AssetsResponse {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  activePolicy: { id: number; policyNumber: string; startDate?: string; endDate?: string } | null;
}

interface Filters {
  assetTypes: string[];
  plants: string[];
  conditions: string[];
  sbus: string[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function parseCondition(raw?: string): { status: string; date: string } {
  if (!raw) return { status: "", date: "" };
  const parts = raw.split("|");
  return { status: parts[0]?.trim() ?? "", date: parts[1]?.trim() ?? "" };
}

function ConditionBadge({ raw }: { raw?: string }) {
  const { status, date } = parseCondition(raw);
  if (!status) return <span className="text-slate-400">—</span>;
  const colorMap: Record<string, string> = {
    "Working": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Fit For Purpose": "bg-blue-50 text-blue-700 border-blue-200",
    "Not in use": "bg-slate-100 text-slate-500 border-slate-200",
    "Damaged": "bg-red-50 text-red-700 border-red-200",
    "Under Repair": "bg-amber-50 text-amber-700 border-amber-200",
  };
  const cls = colorMap[status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap", cls)}>{status}</span>
      {date && <span className="text-xs text-slate-400 whitespace-nowrap">{date}</span>}
    </div>
  );
}

function formatCurrency(val?: string) {
  const n = parseFloat(val ?? "");
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function PlantSearch({ value, onChange, plants }: { value: string; onChange: (v: string) => void; plants: string[] }) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debouncedInput = useDebounce(input, 250);

  useEffect(() => { setInput(value); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = debouncedInput
    ? plants.filter((p) => p.toLowerCase().includes(debouncedInput.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div ref={ref} className="relative">
      <input
        className="input-base w-full min-w-[150px]"
        placeholder="Filter by plant…"
        value={input}
        onChange={(e) => { setInput(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
        onFocus={() => { if (input) setOpen(true); }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p}
              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors truncate"
              onClick={() => { onChange(p); setInput(p); setOpen(false); }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZES = [20, 50, 100];

export default function AssetList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activePolicy, setActivePolicy] = useState<AssetsResponse["activePolicy"]>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assetType, setAssetType] = useState("");
  const [plant, setPlant] = useState("");
  const [condition, setCondition] = useState("");
  const [sbu, setSbu] = useState("");
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<Filters>({ assetTypes: [], plants: [], conditions: [], sbus: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [jumpPage, setJumpPage] = useState("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch("/api/assets/filters", { credentials: "include" });
      if (res.ok) setFilters(await res.json());
    } catch {}
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (assetType) params.set("assetType", assetType);
      if (plant) params.set("plant", plant);
      if (condition) params.set("condition", condition);
      if (sbu) params.set("sbu", sbu);
      const res = await fetch(`/api/assets?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data: AssetsResponse = await res.json();
      setAssets(data.assets);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setActivePolicy(data.activePolicy);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, assetType, plant, condition, sbu, limit]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { setPage(1); }, [debouncedSearch, assetType, plant, condition, sbu, limit]);
  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const clearFilters = () => {
    setSearch("");
    setAssetType("");
    setPlant("");
    setCondition("");
    setSbu("");
    setPage(1);
  };

  const hasFilters = search || assetType || plant || condition || sbu;
  const activeFilterCount = [search, assetType, plant, condition, sbu].filter(Boolean).length;

  const exportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "9999" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (assetType) params.set("assetType", assetType);
      if (plant) params.set("plant", plant);
      if (condition) params.set("condition", condition);
      if (sbu) params.set("sbu", sbu);
      const res = await fetch(`/api/assets?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data: AssetsResponse = await res.json();
      const cols = ["Sr No", "Asset No", "Inventory No", "Description", "Type", "Sub Type", "Model", "Processor", "RAM", "HDD", "IT Serial No", "LCD Serial No", "Plant", "SBU", "Condition", "Inventory Date", "Cost (Local)", "NBV (Local)", "Quantity"];
      const rows = data.assets.map((a) => {
        const { status, date } = parseCondition(a.condition);
        return [
          a.srNo ?? "", a.assetNo ?? "", a.inventoryNo ?? "", a.assetDescription ?? "",
          a.assetType ?? "", a.assetSubType ?? "", a.model ?? "", a.processor ?? "",
          a.ram ?? "", a.hdd ?? "", a.itSerialNo ?? "", a.lcdSerialNo ?? "",
          a.plant ?? "", a.sbu ?? "", status, date, a.costLocal ?? "", a.nbvLocal ?? "", a.quantity ?? "",
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });
      const csv = [cols.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `assets-${activePolicy?.policyNumber ?? "export"}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleJumpPage = () => {
    const p = Number(jumpPage);
    if (p >= 1 && p <= totalPages) { setPage(p); setJumpPage(""); }
  };

  const pageNumbers = (() => {
    const pages: number[] = [];
    const delta = 2;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  })();

  return (
    <AppLayout>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Asset List</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activePolicy
              ? <>Active policy: <span className="font-semibold text-indigo-600">{activePolicy.policyNumber}</span>
                  {activePolicy.startDate && activePolicy.endDate && <span className="text-slate-400"> ({activePolicy.startDate} → {activePolicy.endDate})</span>}
                </>
              : "No active policy. Contact an admin to activate a policy."}
          </p>
        </div>
        {activePolicy && (
          <button
            onClick={exportCSV}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        )}
      </div>

      {!activePolicy && !loading ? (
        <div className="card p-12 text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold">No Active Policy</p>
          <p className="text-slate-400 text-sm mt-1">An admin needs to activate a policy and upload its asset data before assets can be viewed here.</p>
        </div>
      ) : (
        <>
          {/* Search & Filter Bar */}
          <div className="card p-4 mb-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="input-base pl-9"
                    placeholder="Search by Asset No, Inventory No, Serial No, Model, Description, Plant…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border rounded-xl transition-colors whitespace-nowrap",
                    showFilters || activeFilterCount > 0
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                  <select
                    className="input-base w-auto min-w-[140px]"
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                  >
                    <option value="">All Asset Types</option>
                    {filters.assetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select
                    className="input-base w-auto min-w-[130px]"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="">All Conditions</option>
                    {filters.conditions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    className="input-base w-auto min-w-[130px]"
                    value={sbu}
                    onChange={(e) => setSbu(e.target.value)}
                  >
                    <option value="">All SBUs</option>
                    {filters.sbus.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <PlantSearch value={plant} onChange={setPlant} plants={filters.plants} />
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Clear All
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between mb-3 gap-4">
            <p className="text-sm text-slate-500">
              {loading ? "Loading…" : (
                <>
                  <span className="font-semibold text-slate-800">{total.toLocaleString()}</span> assets
                  {hasFilters && total < 3061 && <span className="text-slate-400"> (filtered)</span>}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Rows per page:</label>
              <select
                className="input-base py-1 text-xs w-auto"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : assets.length === 0 ? (
              <div className="py-16 text-center">
                <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No assets found</p>
                {hasFilters && <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters.</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">#</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Asset No</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Inventory No</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Model</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Specs</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Serial No</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Plant / SBU</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">NBV (₹)</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {assets.map((asset, idx) => (
                      <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                          {((page - 1) * limit) + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-700 font-bold whitespace-nowrap">{asset.assetNo || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{asset.inventoryNo || "—"}</td>
                        <td className="px-4 py-3 text-slate-800 max-w-[220px]">
                          <div className="truncate" title={asset.assetDescription}>{asset.assetDescription || "—"}</div>
                          {asset.assetSubType && <div className="text-xs text-slate-400 truncate">{asset.assetSubType}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {asset.assetType ? (
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">{asset.assetType}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap max-w-[150px]">
                          <div className="truncate" title={asset.model}>{asset.model || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {asset.processor || asset.ram || asset.hdd ? (
                            <div className="space-y-0.5">
                              {asset.processor && <div className="truncate max-w-[150px]" title={asset.processor}>{asset.processor}</div>}
                              <div className="flex gap-1.5 flex-wrap">
                                {asset.ram && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">{asset.ram}</span>}
                                {asset.hdd && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">{asset.hdd}</span>}
                              </div>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {asset.itSerialNo || asset.lcdSerialNo || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                          <div className="font-medium">{asset.plant || "—"}</div>
                          {asset.sbu && <div className="text-slate-400">{asset.sbu}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-700 whitespace-nowrap text-right">
                          {asset.nbvLocal ? (
                            <div>
                              <div className="font-semibold">{formatCurrency(asset.nbvLocal)}</div>
                              {asset.costLocal && asset.costLocal !== asset.nbvLocal && (
                                <div className="text-slate-400 line-through">{formatCurrency(asset.costLocal)}</div>
                              )}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <ConditionBadge raw={asset.condition} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-800">{((page - 1) * limit) + 1}–{Math.min(page * limit, total)}</span> of <span className="font-semibold text-slate-800">{total.toLocaleString()}</span> assets
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="First page"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {pageNumbers[0] > 1 && (
                  <>
                    <button onClick={() => setPage(1)} className="w-8 h-8 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">1</button>
                    {pageNumbers[0] > 2 && <span className="text-slate-400 text-sm px-1">…</span>}
                  </>
                )}

                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 text-sm font-semibold rounded-lg transition-colors",
                      p === page ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {p}
                  </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="text-slate-400 text-sm px-1">…</span>}
                    <button onClick={() => setPage(totalPages)} className="w-8 h-8 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">{totalPages}</button>
                  </>
                )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  title="Last page"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-500 whitespace-nowrap">Go to</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    className="input-base w-14 py-1 text-xs text-center"
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJumpPage()}
                    placeholder={String(page)}
                  />
                  <button
                    onClick={handleJumpPage}
                    className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >Go</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
