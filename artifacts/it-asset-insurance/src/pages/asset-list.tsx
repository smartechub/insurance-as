import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2, Search, Filter, X, Database, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Asset {
  id: number;
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
  sbu?: string;
  quantity?: string;
  costLocal?: string;
  nbvLocal?: string;
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
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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
  const [filters, setFilters] = useState<Filters>({ assetTypes: [], plants: [], conditions: [] });

  const debouncedSearch = useDebounce(search, 400);
  const limit = 20;

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
  }, [page, debouncedSearch, assetType, plant, condition]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { setPage(1); }, [debouncedSearch, assetType, plant, condition]);
  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const clearFilters = () => {
    setSearch("");
    setAssetType("");
    setPlant("");
    setCondition("");
    setPage(1);
  };

  const hasFilters = search || assetType || plant || condition;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-slate-900">Asset List</h1>
        <p className="text-sm text-slate-500 mt-1">
          {activePolicy
            ? <>Assets from active policy: <span className="font-semibold text-indigo-600">{activePolicy.policyNumber}</span></>
            : "No active policy. Contact an admin to activate a policy."}
        </p>
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
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input-base pl-9"
                  placeholder="Search by Asset No, Inventory No, Serial No, Model…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
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
                  value={plant}
                  onChange={(e) => setPlant(e.target.value)}
                >
                  <option value="">All Plants</option>
                  {filters.plants.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  className="input-base w-auto min-w-[130px]"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="">All Conditions</option>
                  {filters.conditions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {hasFilters && (
                  <button onClick={clearFilters} className="px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors">
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">
              {loading ? "Loading…" : <><span className="font-semibold text-slate-800">{total.toLocaleString()}</span> assets found</>}
            </p>
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
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Asset No", "Inventory No", "Description", "Asset Type", "Model", "Processor", "RAM", "HDD", "Serial No", "Plant", "Condition"].map((h) => (
                        <th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-indigo-700 font-bold whitespace-nowrap">{asset.assetNo || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{asset.inventoryNo || "—"}</td>
                        <td className="px-4 py-3 text-slate-800 max-w-[200px] truncate" title={asset.assetDescription}>{asset.assetDescription || "—"}</td>
                        <td className="px-4 py-3">
                          {asset.assetType ? (
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold whitespace-nowrap">{asset.assetType}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{asset.model || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{asset.processor || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{asset.ram || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{asset.hdd || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{asset.itSerialNo || asset.lcdSerialNo || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{asset.plant || "—"}</td>
                        <td className="px-4 py-3">
                          {asset.condition ? (
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap",
                              asset.condition === "Good" ? "bg-emerald-50 text-emerald-700" :
                              asset.condition === "Average" ? "bg-amber-50 text-amber-700" :
                              "bg-red-50 text-red-700"
                            )}>{asset.condition}</span>
                          ) : "—"}
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
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages} — {total.toLocaleString()} total assets
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = i + 1;
                    if (totalPages > 5 && page > 3) p = page - 2 + i;
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "w-9 h-9 text-sm font-semibold rounded-lg transition-colors",
                          p === page ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
