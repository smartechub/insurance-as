import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetClaims, useDeleteClaim, ClaimStatus, useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, Filter, Plus, Eye, Trash2, ChevronLeft, ChevronRight, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Settled: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_DOT: Record<string, string> = {
  Pending: "bg-amber-400",
  Processing: "bg-indigo-500",
  Approved: "bg-emerald-500",
  Rejected: "bg-red-500",
  Settled: "bg-slate-400",
};

export default function ClaimsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { data, isLoading } = useGetClaims({ page, limit: 10, search, status });
  const { data: user } = useGetMe();
  const deleteMutation = useDeleteClaim();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDeleteConfirm = () => {
    if (deleteTargetId == null) return;
    deleteMutation.mutate({ id: deleteTargetId }, {
      onSuccess: () => {
        toast({ title: "Claim deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
        setDeleteTargetId(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete claim" });
        setDeleteTargetId(null);
      },
    });
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Claims Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage all IT asset insurance claims.</p>
        </div>
        <Link href="/claims/new" className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> New Claim
        </Link>
      </div>

      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee, asset code, case ID..."
              className="input-base pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="relative sm:w-52">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              className="input-base pl-9 appearance-none"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {Object.values(ClaimStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Case ID</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Payable</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                    <p className="text-sm text-slate-400 mt-2">Loading claims...</p>
                  </td>
                </tr>
              ) : data?.claims?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No claims found</p>
                    <p className="text-xs text-slate-300 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                data?.claims?.map(claim => (
                  <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm text-slate-900">{claim.employeeName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{claim.employeeId}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-slate-700">{claim.assetType ?? "—"}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{claim.assetCode}</div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-xs font-mono text-slate-500">{claim.caseId ?? "—"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("badge border", STATUS_STYLES[claim.claimStatus])}>
                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOT[claim.claimStatus])} />
                        {claim.claimStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm font-semibold text-slate-800">{formatCurrency(claim.payableAmount)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Link href={`/claims/${claim.id}`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {user?.role === "admin" && (
                          <button onClick={() => setDeleteTargetId(claim.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-700">{page}</span> · {data?.claims?.length ?? 0} results
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(data?.claims?.length ?? 0) < 10}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete Claim"
        description="Are you sure you want to delete this claim? This action is permanent and cannot be undone."
        confirmLabel="Delete Claim"
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </AppLayout>
  );
}
