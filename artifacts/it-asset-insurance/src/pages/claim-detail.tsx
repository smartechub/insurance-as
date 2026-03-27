import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetClaimById, useUpdateClaim, useGetDocumentsByClaim, useDeleteDocument } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ArrowLeft, Edit2, FileText, UploadCloud, X, Loader2, Image as ImageIcon, Trash2,
  Save, History, CheckCircle2, Clock, AlertCircle, XCircle, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SettingOption { id: number; value: string; }

function useSettingOptions(category: string) {
  const [options, setOptions] = useState<string[]>([]);
  useEffect(() => {
    fetch(`/api/settings/${category}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: SettingOption[]) => setOptions(data.map((o) => o.value)))
      .catch(() => {});
  }, [category]);
  return options;
}

interface AuditLog {
  id: number;
  action: string;
  description: string;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  createdAt: string;
  metadata: any;
}

export default function ClaimDetail() {
  const [, params] = useRoute("/claims/:id");
  const id = parseInt(params?.id || "0");
  const { data: claim, isLoading } = useGetClaimById(id);
  const { data: documents, isLoading: docsLoading } = useGetDocumentsByClaim(id);

  const [activeTab, setActiveTab] = useState<"details" | "documents" | "history">("details");
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <AppLayout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;
  if (!claim) return <AppLayout><p className="p-8 text-slate-500">Claim not found.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href="/claims" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-600 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Claims
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900">Claim #{claim.id}</h1>
            <p className="text-sm text-slate-500 font-mono mt-1">{claim.assetCode} · {claim.employeeName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("badge border", getStatusColor(claim.claimStatus))}>
              {claim.claimStatus}
            </span>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit Claim
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        {(["details", "documents", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px capitalize",
              activeTab === tab
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab === "documents"
              ? `Documents${documents?.length ? ` (${documents.length})` : ""}`
              : tab === "history"
              ? "History"
              : "Claim Details"}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <DetailCard title="Basic Information">
              <DetailRow label="Employee Name" value={claim.employeeName} />
              <DetailRow label="Employee ID" value={claim.employeeId} />
              <DetailRow label="Asset Type" value={claim.assetType} />
              <DetailRow label="Asset Code" value={claim.assetCode} />
              <DetailRow label="Serial No" value={claim.serialNo} />
            </DetailCard>

            <DetailCard title="Incident Details">
              <DetailRow label="Damage Date" value={claim.damageDate ? new Date(claim.damageDate).toLocaleDateString() : "N/A"} />
              <DetailRow label="Repair Date" value={claim.repairDate ? new Date(claim.repairDate).toLocaleDateString() : "N/A"} />
              <DetailRow label="Affected Part" value={claim.effectedPart} />
              <DetailRow label="Case ID" value={claim.caseId} />
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-500 mb-1">Remark</p>
                <p className="text-slate-900 bg-slate-50 p-4 rounded-xl leading-relaxed">{claim.remark || "No remark provided."}</p>
              </div>
            </DetailCard>
          </div>

          <div className="space-y-6">
            <StatusUpdateCard claimId={id} currentStatus={claim.claimStatus} />

            <DetailCard title="Financials">
              <DetailRow label="Payable Amount" value={formatCurrency(claim.payableAmount)} highlight />
              <DetailRow label="Recover Amount" value={formatCurrency(claim.recoverAmount)} />
              <DetailRow label="File Charge" value={formatCurrency(claim.fileCharge)} />
            </DetailCard>

            <DetailCard title="System Details">
              <DetailRow label="Created At" value={claim.createdAt ? new Date(claim.createdAt).toLocaleString() : "N/A"} />
              <DetailRow label="Last Updated" value={claim.updatedAt ? new Date(claim.updatedAt).toLocaleString() : "N/A"} />
            </DetailCard>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <DocumentManager claimId={id} documents={documents || []} />
      )}

      {activeTab === "history" && (
        <ClaimHistory claimId={id} />
      )}

      {editOpen && (
        <EditClaimModal
          claim={claim}
          onClose={() => setEditOpen(false)}
        />
      )}
    </AppLayout>
  );
}

/* ─── Status Update Card ───────────────────────────────────────────── */

function StatusUpdateCard({ claimId, currentStatus }: { claimId: number; currentStatus: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const statusOptions = useSettingOptions("claimStatuses");
  const updateMutation = useUpdateClaim();
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSelectedStatus(currentStatus); }, [currentStatus]);

  const hasChanged = selectedStatus !== currentStatus;

  const handleSave = async () => {
    if (!hasChanged) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ id: claimId, data: { claimStatus: selectedStatus as any } });
      queryClient.invalidateQueries({ queryKey: [`/api/claims/${claimId}`] });
      toast({ title: "Status updated", description: `Claim status changed to "${selectedStatus}".` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setSaving(false);
    }
  };

  const allStatuses = statusOptions.length > 0 ? statusOptions : ["Pending", "Processing", "Approved", "Rejected", "Settled"];

  return (
    <div className="card p-5">
      <h2 className="text-sm font-display font-bold text-slate-700 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">Update Status</h2>
      <div className="space-y-3">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="input-base text-sm appearance-none"
        >
          {allStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={!hasChanged || saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Status"}
        </button>
      </div>
    </div>
  );
}

/* ─── Edit Claim Modal ─────────────────────────────────────────────── */

function EditClaimModal({ claim, onClose }: { claim: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateClaim();
  const assetTypeOptions = useSettingOptions("assetTypes");
  const effectedPartOptions = useSettingOptions("effectedParts");
  const statusOptions = useSettingOptions("claimStatuses");
  const [saving, setSaving] = useState(false);

  const allStatuses = statusOptions.length > 0 ? statusOptions : ["Pending", "Processing", "Approved", "Rejected", "Settled"];

  const [form, setForm] = useState({
    employeeId: claim.employeeId ?? "",
    employeeName: claim.employeeName ?? "",
    assetCode: claim.assetCode ?? "",
    assetType: claim.assetType ?? "",
    serialNo: claim.serialNo ?? "",
    damageDate: claim.damageDate ?? "",
    repairDate: claim.repairDate ?? "",
    effectedPart: claim.effectedPart ?? "",
    caseId: claim.caseId ?? "",
    payableAmount: claim.payableAmount != null ? String(claim.payableAmount) : "",
    recoverAmount: claim.recoverAmount != null ? String(claim.recoverAmount) : "",
    fileCharge: claim.fileCharge != null ? String(claim.fileCharge) : "",
    remark: claim.remark ?? "",
    claimStatus: claim.claimStatus ?? "Pending",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId.trim() || !form.employeeName.trim() || !form.assetCode.trim()) {
      toast({ variant: "destructive", title: "Validation error", description: "Employee ID, Employee Name, and Asset Code are required." });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        payableAmount: form.payableAmount ? parseFloat(form.payableAmount) : null,
        recoverAmount: form.recoverAmount ? parseFloat(form.recoverAmount) : null,
        fileCharge: form.fileCharge ? parseFloat(form.fileCharge) : null,
      };
      await updateMutation.mutateAsync({ id: claim.id, data: payload });
      queryClient.invalidateQueries({ queryKey: [`/api/claims/${claim.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      toast({ title: "Claim updated successfully" });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Failed to update claim" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900">Edit Claim #{claim.id}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Update the claim details below</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ModalField label="Employee ID *" name="employeeId" value={form.employeeId} onChange={handleChange} required />
              <ModalField label="Employee Name *" name="employeeName" value={form.employeeName} onChange={handleChange} required />
              <ModalField label="Asset Code *" name="assetCode" value={form.assetCode} onChange={handleChange} required />
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Asset Type</label>
                <select name="assetType" value={form.assetType} onChange={handleChange} className="input-base text-sm appearance-none">
                  <option value="">Select asset type</option>
                  {assetTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <ModalField label="Serial No" name="serialNo" value={form.serialNo} onChange={handleChange} />
            </div>
          </section>

          {/* Incident Details */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Incident Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ModalField label="Damage Date" type="date" name="damageDate" value={form.damageDate} onChange={handleChange} />
              <ModalField label="Repair Date" type="date" name="repairDate" value={form.repairDate} onChange={handleChange} />
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Affected Part</label>
                <select name="effectedPart" value={form.effectedPart} onChange={handleChange} className="input-base text-sm appearance-none">
                  <option value="">Select affected part</option>
                  {effectedPartOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <ModalField label="Case ID" name="caseId" value={form.caseId} onChange={handleChange} />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Remark</label>
              <textarea name="remark" value={form.remark} onChange={handleChange} rows={3} className="input-base text-sm" placeholder="Add a remark..." />
            </div>
          </section>

          {/* Financial Details */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Financial Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ModalField label="Payable Amount (₹)" type="number" step="0.01" name="payableAmount" value={form.payableAmount} onChange={handleChange} />
              <ModalField label="Recover Amount (₹)" type="number" step="0.01" name="recoverAmount" value={form.recoverAmount} onChange={handleChange} />
              <ModalField label="File Charge (₹)" type="number" step="0.01" name="fileCharge" value={form.fileCharge} onChange={handleChange} />
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Claim Status</h3>
            <select name="claimStatus" value={form.claimStatus} onChange={handleChange} className="input-base text-sm appearance-none max-w-xs">
              {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </section>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input {...props} className="input-base text-sm" />
    </div>
  );
}

/* ─── Claim History ─────────────────────────────────────────────────── */

function ClaimHistory({ claimId }: { claimId: number }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/claims/${claimId}/history`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [claimId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
    </div>
  );

  if (logs.length === 0) return (
    <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
      <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 font-medium">No activity recorded yet.</p>
    </div>
  );

  return (
    <div className="card p-6">
      <h2 className="text-sm font-display font-bold text-slate-700 uppercase tracking-wider mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
        <History className="w-4 h-4" /> Activity Timeline
      </h2>
      <div className="space-y-0">
        {logs.map((log, idx) => (
          <div key={log.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", getActionIcon(log.action).bg)}>
                {getActionIcon(log.action).icon}
              </div>
              {idx < logs.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
            </div>
            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800" dangerouslySetInnerHTML={{ __html: log.description }} />
                  {log.userName && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      By <span className="font-semibold text-slate-600">{log.userName}</span>
                      {log.userRole && <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{log.userRole}</span>}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getActionIcon(action: string) {
  switch (action) {
    case "CLAIM_CREATED": return { bg: "bg-emerald-100", icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> };
    case "CLAIM_UPDATED": return { bg: "bg-indigo-100", icon: <Edit2 className="w-4 h-4 text-indigo-600" /> };
    case "CLAIM_DELETED": return { bg: "bg-red-100", icon: <XCircle className="w-4 h-4 text-red-600" /> };
    case "CLAIM_VIEWED": return { bg: "bg-slate-100", icon: <Clock className="w-4 h-4 text-slate-400" /> };
    case "DOCUMENT_UPLOADED": return { bg: "bg-blue-100", icon: <FileText className="w-4 h-4 text-blue-600" /> };
    case "DOCUMENT_DELETED": return { bg: "bg-orange-100", icon: <Trash2 className="w-4 h-4 text-orange-600" /> };
    default: return { bg: "bg-slate-100", icon: <AlertCircle className="w-4 h-4 text-slate-400" /> };
  }
}

/* ─── Detail Card / Row ─────────────────────────────────────────────── */

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-display font-bold text-slate-700 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">{title}</h2>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, highlight = false }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className={cn("text-right font-medium text-slate-900", highlight && "text-xl font-bold text-primary")}>
        {value || "-"}
      </span>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "Pending": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Processing": return "bg-blue-100 text-blue-800 border-blue-200";
    case "Approved": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Rejected": return "bg-red-100 text-red-800 border-red-200";
    case "Settled": return "bg-slate-100 text-slate-800 border-slate-200";
    default: return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

/* ─── Document Manager ──────────────────────────────────────────────── */

function DocumentManager({ claimId, documents }: { claimId: number; documents: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("Quotation");
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

  const deleteDocMutation = useDeleteDocument();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      const res = await fetch(`/api/documents/upload/${claimId}`, {
        method: "POST", body: formData, credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/claim/${claimId}`] });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to upload document" }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      uploadMutation.mutate({ file: e.target.files[0], documentType: docType });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteDocId == null) return;
    deleteDocMutation.mutate(
      { id: deleteDocId },
      {
        onSuccess: () => {
          toast({ title: "Document deleted" });
          queryClient.invalidateQueries({ queryKey: [`/api/documents/claim/${claimId}`] });
          setDeleteDocId(null);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to delete document" });
          setDeleteDocId(null);
        },
      }
    );
  };

  const docCategories = ["Damage Images", "Repair Images", "Quotation", "Invoice", "Claim Form", "Other"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="card p-5 sticky top-8">
          <h3 className="text-sm font-display font-bold text-slate-700 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">Upload New</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Document Type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="input-base appearance-none">
                {docCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="w-full btn-primary justify-center"
            >
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              Select & Upload
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="card p-5">
          <h3 className="text-sm font-display font-bold text-slate-700 uppercase tracking-wider mb-5 pb-3 border-b border-slate-100">Uploaded Documents</h3>
          {documents.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all bg-white group">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-primary">
                    {doc.fileType?.includes("image") ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate" title={doc.fileName}>{doc.fileName}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{doc.documentType || "Document"}</p>
                    <div className="flex gap-2 mt-3">
                      <a href={`/api/documents/file/${doc.filePath}`} target="_blank" rel="noreferrer"
                        className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary hover:text-white transition-colors">
                        View
                      </a>
                      <button onClick={() => setDeleteDocId(doc.id)}
                        className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteDocId !== null}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete Document"
        loading={deleteDocMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDocId(null)}
      />
    </div>
  );
}
