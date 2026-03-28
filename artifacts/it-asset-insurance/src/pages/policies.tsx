import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Loader2, Trash2, CheckCircle, FileText, UploadCloud,
  Eye, XCircle, Edit2, X, ChevronLeft, ChevronRight, Database,
  ToggleLeft, ToggleRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Policy {
  id: number;
  policyNumber: string;
  startDate?: string;
  endDate?: string;
  pdfFilePath?: string;
  pdfFileName?: string;
  isActive: boolean;
  createdAt: string;
  assetCount: number;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function usePolicies() {
  return useQuery<Policy[]>({ queryKey: ["policies"], queryFn: () => apiFetch("/api/policies") });
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
      isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
    )}>
      {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

interface PolicyFormData {
  policyNumber: string;
  startDate: string;
  endDate: string;
}

function PolicyFormModal({
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  initial?: Policy;
  onClose: () => void;
  onSave: (data: PolicyFormData, file: File | null) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<PolicyFormData>({
    policyNumber: initial?.policyNumber ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-display font-bold text-slate-900">
            {initial ? "Edit Policy" : "Create Policy"}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Policy Number *</label>
            <input
              className="input-base"
              value={form.policyNumber}
              onChange={(e) => setForm((p) => ({ ...p, policyNumber: e.target.value }))}
              placeholder="e.g. POL-2024-001"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
              <input type="date" className="input-base" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
              <input type="date" className="input-base" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Policy PDF</label>
            {initial?.pdfFileName && !pdfFile && (
              <p className="text-xs text-slate-500 mb-2">Current: {initial.pdfFileName}</p>
            )}
            <input ref={pdfRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
            {pdfFile ? (
              <div className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50">
                <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="text-sm text-slate-700 truncate flex-1">{pdfFile.name}</span>
                <button type="button" onClick={() => setPdfFile(null)} className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => pdfRef.current?.click()}
                className="w-full flex items-center gap-2 justify-center py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 text-sm font-medium transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                {initial?.pdfFileName ? "Replace PDF" : "Upload PDF"}
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => { if (form.policyNumber) onSave(form, pdfFile); }}
            disabled={isSaving || !form.policyNumber}
            className="btn-primary disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {initial ? "Save Changes" : "Create Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExcelUploadModal({ policy, onClose }: { policy: Policy; onClose: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("excel", file);
      const res = await fetch(`/api/policies/${policy.id}/upload-excel`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast({ title: "Assets imported", description: `${data.assetCount} assets loaded from Excel` });
      qc.invalidateQueries({ queryKey: ["policies"] });
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900">Upload Asset Excel</h2>
            <p className="text-xs text-slate-400 mt-0.5">Policy: {policy.policyNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
            <strong>Note:</strong> Uploading a new Excel file will replace all existing assets for this policy.
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 mb-4">
              <Database className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 text-sm font-medium transition-all mb-4"
            >
              <UploadCloud className="w-8 h-8" />
              <span>Click to select Excel file (.xlsx, .xls)</span>
            </button>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Import Assets
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  const { data: policies = [], isLoading } = usePolicies();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);
  const [excelPolicy, setExcelPolicy] = useState<Policy | null>(null);
  const [pdfPreview, setPdfPreview] = useState<Policy | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: PolicyFormData, file: File | null, existingId?: number) => {
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("policyNumber", data.policyNumber);
      if (data.startDate) fd.append("startDate", data.startDate);
      if (data.endDate) fd.append("endDate", data.endDate);
      if (file) fd.append("pdf", file);

      const url = existingId ? `/api/policies/${existingId}` : "/api/policies";
      const method = existingId ? "PUT" : "POST";
      const res = await fetch(url, { method, body: fd, credentials: "include" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save policy");
      toast({ title: existingId ? "Policy updated" : "Policy created" });
      qc.invalidateQueries({ queryKey: ["policies"] });
      setShowCreate(false);
      setEditPolicy(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async (policy: Policy) => {
    try {
      const res = await fetch(`/api/policies/${policy.id}/activate`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to activate");
      toast({ title: `Policy ${policy.policyNumber} activated` });
      qc.invalidateQueries({ queryKey: ["policies"] });
    } catch {
      toast({ variant: "destructive", title: "Failed to activate policy" });
    }
  };

  const handleDeactivate = async (policy: Policy) => {
    try {
      const res = await fetch(`/api/policies/${policy.id}/deactivate`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to deactivate");
      toast({ title: `Policy ${policy.policyNumber} deactivated` });
      qc.invalidateQueries({ queryKey: ["policies"] });
    } catch {
      toast({ variant: "destructive", title: "Failed to deactivate policy" });
    }
  };

  const handleDelete = async (policy: Policy) => {
    if (!confirm(`Delete policy "${policy.policyNumber}"? This will also remove all its assets.`)) return;
    try {
      const res = await fetch(`/api/policies/${policy.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Policy deleted" });
      qc.invalidateQueries({ queryKey: ["policies"] });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete policy" });
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Policy Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage insurance policies and their asset data.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : policies.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No policies yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first policy to get started.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Create Policy
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Policy Number</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Assets</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">PDF</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{policy.policyNumber}</td>
                    <td className="px-5 py-4"><StatusBadge isActive={policy.isActive} /></td>
                    <td className="px-5 py-4 text-slate-600">
                      {policy.startDate || policy.endDate ? (
                        <span>{policy.startDate || "—"} → {policy.endDate || "—"}</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                        <Database className="w-3 h-3" />
                        {policy.assetCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {policy.pdfFilePath ? (
                        <button
                          onClick={() => setPdfPreview(policy)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">No PDF</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => policy.isActive ? handleDeactivate(policy) : handleActivate(policy)}
                          title={policy.isActive ? "Deactivate policy" : "Activate policy"}
                          className="flex items-center gap-1.5 transition-colors"
                        >
                          {policy.isActive ? (
                            <ToggleRight className="w-7 h-7 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-slate-300" />
                          )}
                          <span className={cn("text-xs font-semibold", policy.isActive ? "text-emerald-600" : "text-slate-400")}>
                            {policy.isActive ? "Active" : "Inactive"}
                          </span>
                        </button>
                        <button
                          onClick={() => setExcelPolicy(policy)}
                          title="Upload Excel"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Database className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditPolicy(policy)}
                          title="Edit"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(policy)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={policy.isActive}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <PolicyFormModal
          onClose={() => setShowCreate(false)}
          onSave={(data, file) => handleSave(data, file)}
          isSaving={isSaving}
        />
      )}

      {editPolicy && (
        <PolicyFormModal
          initial={editPolicy}
          onClose={() => setEditPolicy(null)}
          onSave={(data, file) => handleSave(data, file, editPolicy.id)}
          isSaving={isSaving}
        />
      )}

      {excelPolicy && (
        <ExcelUploadModal policy={excelPolicy} onClose={() => setExcelPolicy(null)} />
      )}

      {pdfPreview && pdfPreview.pdfFilePath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900">Policy PDF</h3>
                <p className="text-xs text-slate-400">{pdfPreview.policyNumber} — {pdfPreview.pdfFileName}</p>
              </div>
              <button onClick={() => setPdfPreview(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`/api/policies/${pdfPreview.pdfFilePath}/pdf`}
                className="w-full h-full rounded-b-2xl"
                title="Policy PDF"
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
