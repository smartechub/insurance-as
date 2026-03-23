import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetClaims, useDeleteClaim, ClaimStatus, useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ClaimsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  
  const { data, isLoading } = useGetClaims({ page, limit: 10, search, status });
  const { data: user } = useGetMe();
  const deleteMutation = useDeleteClaim();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this claim?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Claim deleted successfully" });
          queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to delete claim" });
        }
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Settled': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display text-slate-900 mb-2">Claims Management</h1>
          <p className="text-slate-500">Track, review, and manage all IT asset insurance claims.</p>
        </div>
        <Link 
          href="/claims/new" 
          className="flex items-center gap-2 primary-gradient px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Claim
        </Link>
      </div>

      <div className="glass-card rounded-3xl p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by Employee ID, Name, Asset Code..." 
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.values(ClaimStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Asset Details</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payable Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading claims...</td></tr>
              ) : data?.claims?.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No claims found matching your criteria.</td></tr>
              ) : (
                data?.claims?.map(claim => (
                  <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{claim.employeeName}</div>
                      <div className="text-xs text-slate-500 font-mono">{claim.employeeId}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">{claim.assetType}</div>
                      <div className="text-xs text-slate-500 font-mono">Code: {claim.assetCode}</div>
                    </td>
                    <td className="p-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", getStatusColor(claim.claimStatus))}>
                        {claim.claimStatus}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-900">
                      {formatCurrency(claim.payableAmount)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/claims/${claim.id}`} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Eye className="w-5 h-5" />
                        </Link>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(claim.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-5 h-5" />
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
        <div className="flex items-center justify-between mt-6 px-2">
          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-900">{data?.claims?.length || 0}</span> claims
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border-2 border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={(data?.claims?.length || 0) < 10}
              className="p-2 border-2 border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
