import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Loader2, Search, X, Database, ChevronLeft, ChevronRight,
  AlertCircle, Download, ChevronsLeft, ChevronsRight,
  SlidersHorizontal, ChevronDown, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Asset {
  id: number;
  srNo?: string;
  inventoryNo?: string;
  assetNo?: string;
  capitalizationDate?: string;
  assetClass?: string;
  assetClassShortName?: string;
  assetDescription?: string;
  assetType?: string;
  assetSubType?: string;
  sbu?: string;
  plant?: string;
  quantity?: string;
  costLocal?: string;
  nbvLocal?: string;
  condition?: string;
  assetCriticality?: string;
  inventoryOn?: string;
  lcdSerialNo?: string;
  itSerialNo?: string;
  processor?: string;
  hdd?: string;
  ram?: string;
  model?: string;
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

function excelDateToString(val?: string): string {
  if (!val) return "—";
  const n = Number(val);
  if (!isNaN(n) && n > 40000) {
    return new Date((n - 25569) * 86400 * 1000).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }
  return val;
}

function numFmt(val?: string): string {
  const n = parseFloat(val ?? "");
  if (isNaN(n)) return val || "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

function val(v?: string) { return v || "—"; }

/* ── Full-detail slide-over panel ─────────────────────────────── */
function DetailPanel({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: "Identification",
      rows: [
        ["Inventory No.", val(asset.inventoryNo)],
        ["Asset No", val(asset.assetNo)],
        ["Sr No.", val(asset.srNo)],
        ["Asset Class", val(asset.assetClass)],
        ["Asset Class (Short Name)", val(asset.assetClassShortName)],
        ["Asset Description", val(asset.assetDescription)],
        ["Capitalization Date", excelDateToString(asset.capitalizationDate)],
      ],
    },
    {
      title: "Classification",
      rows: [
        ["Asset Type", val(asset.assetType)],
        ["Asset Sub Type", val(asset.assetSubType)],
        ["SBU", val(asset.sbu)],
        ["Plant", val(asset.plant)],
        ["Quantity", val(asset.quantity)],
        ["Asset Criticality", val(asset.assetCriticality)],
      ],
    },
    {
      title: "Hardware Specs",
      rows: [
        ["Model", val(asset.model)],
        ["Processor", val(asset.processor)],
        ["RAM", val(asset.ram)],
        ["HDD", val(asset.hdd)],
        ["IT Serial No", val(asset.itSerialNo)],
        ["LCD Serial No", val(asset.lcdSerialNo)],
      ],
    },
    {
      title: "Financial & Status",
      rows: [
        ["Cost (Local)", numFmt(asset.costLocal)],
        ["NBV (Local)", numFmt(asset.nbvLocal)],
        ["Condition", val(asset.condition)],
        ["Inventory On", excelDateToString(asset.inventoryOn)],
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      {/* panel */}
      <div
        className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Asset Detail</p>
            <h2 className="text-lg font-bold text-slate-900 font-mono">{asset.assetNo || "—"}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{asset.inventoryNo || ""}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{section.title}</h3>
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                {section.rows.map(([label, value], i) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-start gap-3 px-4 py-2.5",
                      i !== section.rows.length - 1 && "border-b border-slate-100"
                    )}
                  >
                    <span className="text-xs text-slate-500 w-40 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm font-medium text-slate-800 break-words min-w-0">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Plant autocomplete ────────────────────────────────────────── */
function PlantSearch({ value, onChange, plants }: { value: string; onChange: (v: string) => void; plants: string[] }) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debouncedInput = useDebounce(input, 200);

  useEffect(() => { setInput(value); }, [value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
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
            <button key={p}
              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors truncate"
              onClick={() => { onChange(p); setInput(p); setOpen(false); }}
            >{p}</button>
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
  const [selected, setSelected] = useState<Asset | null>(null);

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
    } catch {} finally { setLoading(false); }
  }, [page, debouncedSearch, assetType, plant, condition, sbu, limit]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { setPage(1); }, [debouncedSearch, assetType, plant, condition, sbu, limit]);
  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const clearFilters = () => { setSearch(""); setAssetType(""); setPlant(""); setCondition(""); setSbu(""); setPage(1); };
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
      const headers = ["Inventory No.", "Asset No", "Asset Type", "Asset Sub Type", "SBU", "Plant", "LCD Serial No", "IT Serial No", "Model"];
      const rows = data.assets.map((a) =>
        [a.inventoryNo, a.assetNo, a.assetType, a.assetSubType, a.sbu, a.plant, a.lcdSerialNo, a.itSerialNo, a.model]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `assets-${activePolicy?.policyNumber ?? "export"}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const pageNumbers = (() => {
    const pages: number[] = [];
    const left = Math.max(1, page - 2);
    const right = Math.min(totalPages, page + 2);
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  })();

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Asset List</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activePolicy
              ? <>Active policy: <span className="font-semibold text-indigo-600">{activePolicy.policyNumber}</span>
                  {activePolicy.startDate && activePolicy.endDate && (
                    <span className="text-slate-400"> · {activePolicy.startDate} → {activePolicy.endDate}</span>
                  )}</>
              : "No active policy. Contact an admin to activate a policy."}
          </p>
        </div>
        {activePolicy && (
          <button onClick={exportCSV} disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        )}
      </div>

      {!activePolicy && !loading ? (
        <div className="card p-12 text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold">No Active Policy</p>
          <p className="text-slate-400 text-sm mt-1">An admin needs to activate a policy and upload its asset data.</p>
        </div>
      ) : (
        <>
          {/* Search & Filters */}
          <div className="card p-4 mb-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="input-base pl-9"
                    placeholder="Search by Asset No, Inventory No, Serial No, Model, Description…"
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
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <select className="input-base w-auto min-w-[140px]" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                    <option value="">All Asset Types</option>
                    {filters.assetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="input-base w-auto min-w-[130px]" value={condition} onChange={(e) => setCondition(e.target.value)}>
                    <option value="">All Conditions</option>
                    {filters.conditions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="input-base w-auto min-w-[130px]" value={sbu} onChange={(e) => setSbu(e.target.value)}>
                    <option value="">All SBUs</option>
                    {filters.sbus.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <PlantSearch value={plant} onChange={setPlant} plants={filters.plants} />
                  {hasFilters && (
                    <button onClick={clearFilters} className="px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors">
                      <X className="w-3.5 h-3.5" /> Clear All
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3 gap-4">
            <p className="text-sm text-slate-500">
              {loading ? "Loading…" : (
                <>Showing <span className="font-semibold text-slate-800">{((page - 1) * limit) + 1}–{Math.min(page * limit, total)}</span> of{" "}
                  <span className="font-semibold text-slate-800">{total.toLocaleString()}</span> assets</>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Rows:</span>
              <select className="input-base py-1 text-xs w-auto" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      {[
                        "Inventory No.", "Asset No", "Asset Type", "Asset Sub Type",
                        "SBU", "Plant", "LCD Serial No", "IT Serial No", "Model", ""
                      ].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-r border-slate-700 last:border-r-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset, idx) => (
                      <tr key={asset.id} className={cn(
                        "border-b border-slate-100 hover:bg-indigo-50/40 transition-colors",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      )}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{asset.inventoryNo || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">{asset.assetNo || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {asset.assetType
                            ? <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">{asset.assetType}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{asset.assetSubType || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{asset.sbu || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{asset.plant || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{asset.lcdSerialNo || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{asset.itSerialNo || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis" title={asset.model}>{asset.model || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelected(asset)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
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
                Page <span className="font-semibold text-slate-800">{page}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => setPage(1)} disabled={page === 1} title="First page"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {pageNumbers[0] > 1 && (
                  <><button onClick={() => setPage(1)} className="w-8 h-8 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">1</button>
                  {pageNumbers[0] > 2 && <span className="text-slate-400 text-sm px-1">…</span>}</>
                )}
                {pageNumbers.map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn("w-8 h-8 text-sm font-semibold rounded-lg transition-colors",
                      p === page ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}>
                    {p}
                  </button>
                ))}
                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>{pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="text-slate-400 text-sm px-1">…</span>}
                  <button onClick={() => setPage(totalPages)} className="w-8 h-8 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">{totalPages}</button></>
                )}

                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Last page"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronsRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-500 whitespace-nowrap">Go to</span>
                  <input type="number" min={1} max={totalPages} className="input-base w-14 py-1 text-xs text-center"
                    value={jumpPage} onChange={(e) => setJumpPage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { const p = Number(jumpPage); if (p >= 1 && p <= totalPages) { setPage(p); setJumpPage(""); } } }}
                    placeholder={String(page)} />
                  <button
                    onClick={() => { const p = Number(jumpPage); if (p >= 1 && p <= totalPages) { setPage(p); setJumpPage(""); } }}
                    className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
                    Go
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail panel */}
      {selected && <DetailPanel asset={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  );
}
