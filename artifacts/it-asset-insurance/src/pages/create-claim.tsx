import { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateClaim } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Loader2, UploadCloud, X, FileText, Archive,
  Image as ImageIcon, FileCheck, Eye, CheckCircle, AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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

interface AttachmentState {
  damageImages: File | null;
  repairImages: File | null;
  quotation: File | null;
  invoice: File | null;
  claimForm: File | null;
  otherDocuments: File[];
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return <ImageIcon className="w-5 h-5" />;
  if (file.type === "application/pdf") return <FileText className="w-5 h-5" />;
  return <Archive className="w-5 h-5" />;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function FilePreviewCard({ file, onRemove, onPreview }: { file: File; onRemove: () => void; onPreview?: () => void }) {
  const previewUrl = isImageFile(file) ? URL.createObjectURL(file) : undefined;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white group hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-primary flex-shrink-0 overflow-hidden">
        {previewUrl ? <img src={previewUrl} alt={file.name} className="w-full h-full object-cover rounded-lg" /> : getFileIcon(file)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>{file.name}</p>
        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {previewUrl && (
          <button type="button" onClick={onPreview} title="Preview" className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button type="button" onClick={onRemove} title="Remove" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SingleFileUpload({ label, description, accept, file, onChange }: { label: string; description?: string; accept: string; file: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewUrl = file && isImageFile(file) ? URL.createObjectURL(file) : undefined;

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      {description && <p className="text-xs text-slate-400 mb-2">{description}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { onChange(e.target.files?.[0] || null); e.target.value = ""; }} />
      {!file ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="w-full flex flex-col items-center gap-2 py-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-primary hover:bg-primary/5 transition-all text-slate-400 hover:text-primary">
          <UploadCloud className="w-6 h-6" />
          <span className="text-sm font-medium">Click to select file</span>
        </button>
      ) : (
        <div className="space-y-2">
          <FilePreviewCard file={file} onRemove={() => onChange(null)} onPreview={() => setPreviewOpen(true)} />
          <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-primary font-semibold hover:underline">Replace file</button>
        </div>
      )}
      {previewOpen && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewOpen(false)}>
          <div className="relative max-w-3xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setPreviewOpen(false)} className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
            <img src={previewUrl} alt={file.name} className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function MultiFileUpload({ label, description, accept, files, onChange }: { label: string; description?: string; accept: string; files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const previewUrl = previewFile && isImageFile(previewFile) ? URL.createObjectURL(previewFile) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
        {files.length > 0 && <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{files.length} file{files.length !== 1 ? "s" : ""}</span>}
      </div>
      {description && <p className="text-xs text-slate-400 mb-2">{description}</p>}
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => { onChange([...files, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-primary/40 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-primary flex-shrink-0 overflow-hidden">
                {isImageFile(file) ? <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover rounded-lg" /> : getFileIcon(file)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center gap-1">
                {isImageFile(file) && <button type="button" onClick={() => setPreviewFile(file)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"><Eye className="w-4 h-4" /></button>}
                <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => inputRef.current?.click()} className={cn("w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl font-semibold text-sm transition-all", files.length === 0 ? "border-slate-200 bg-slate-50 text-slate-400 hover:border-primary hover:bg-primary/5 hover:text-primary py-5 flex-col" : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary")}>
        {files.length === 0 ? (<><UploadCloud className="w-6 h-6" /><span>Click to add files</span></>) : (<><span className="text-lg leading-none">＋</span><span>Add More Files</span></>)}
      </button>
      {previewFile && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewFile(null)}>
          <div className="relative max-w-3xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setPreviewFile(null)} className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:text-red-500"><X className="w-4 h-4" /></button>
            <img src={previewUrl} alt={previewFile.name} className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

interface AssetLookupResult {
  assetType?: string;
  itSerialNo?: string;
  lcdSerialNo?: string;
  model?: string;
  processor?: string;
  ram?: string;
  hdd?: string;
  policyNumber?: string;
  assetDescription?: string;
}

export default function CreateClaim() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateClaim();
  const [isUploading, setIsUploading] = useState(false);
  const effectedPartOptions = useSettingOptions("effectedParts");

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    assetCode: "",
    assetType: "",
    serialNo: "",
    model: "",
    policyNumber: "",
    damageDate: "",
    repairDate: "",
    effectedPart: "",
    caseId: "",
    payableAmount: "",
    recoverAmount: "",
    fileCharge: "",
    remark: "",
  });

  const [attachments, setAttachments] = useState<AttachmentState>({
    damageImages: null,
    repairImages: null,
    quotation: null,
    invoice: null,
    claimForm: null,
    otherDocuments: [],
  });

  const [assetLookupStatus, setAssetLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [assetInfo, setAssetInfo] = useState<AssetLookupResult | null>(null);
  const debouncedAssetCode = useDebounce(formData.assetCode, 600);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "assetCode") {
      setAssetLookupStatus("idle");
      setAssetInfo(null);
    }
  };

  const fetchAsset = useCallback(async (code: string) => {
    if (!code.trim()) { setAssetLookupStatus("idle"); setAssetInfo(null); return; }
    setAssetLookupStatus("loading");
    setAssetInfo(null);
    try {
      const res = await fetch(`/api/assets/lookup?assetNo=${encodeURIComponent(code.trim())}`, { credentials: "include" });
      if (!res.ok) { setAssetLookupStatus("not_found"); return; }
      const data: AssetLookupResult = await res.json();
      setAssetInfo(data);
      setAssetLookupStatus("found");
      setFormData((prev) => ({
        ...prev,
        assetType: data.assetType || prev.assetType,
        serialNo: data.itSerialNo || data.lcdSerialNo || prev.serialNo,
        model: data.model || prev.model,
        policyNumber: data.policyNumber || prev.policyNumber,
      }));
    } catch {
      setAssetLookupStatus("not_found");
    }
  }, []);

  useEffect(() => {
    fetchAsset(debouncedAssetCode);
  }, [debouncedAssetCode, fetchAsset]);

  const uploadFile = async (claimId: number, file: File, documentType: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentType", documentType);
    const res = await fetch(`/api/documents/upload/${claimId}`, { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) throw new Error(`Failed to upload ${documentType}`);
    return res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      payableAmount: formData.payableAmount ? parseFloat(formData.payableAmount) : undefined,
      recoverAmount: formData.recoverAmount ? parseFloat(formData.recoverAmount) : undefined,
      fileCharge: formData.fileCharge ? parseFloat(formData.fileCharge) : undefined,
    };

    createMutation.mutate(
      { data: payload as any },
      {
        onSuccess: async (data) => {
          const claimId = data.id;
          const uploads: { file: File; documentType: string }[] = [];
          if (attachments.damageImages) uploads.push({ file: attachments.damageImages, documentType: "Damage Images" });
          if (attachments.repairImages) uploads.push({ file: attachments.repairImages, documentType: "Repair Images" });
          if (attachments.quotation) uploads.push({ file: attachments.quotation, documentType: "Quotation" });
          if (attachments.invoice) uploads.push({ file: attachments.invoice, documentType: "Invoice" });
          if (attachments.claimForm) uploads.push({ file: attachments.claimForm, documentType: "Claim Form" });
          attachments.otherDocuments.forEach((file) => uploads.push({ file, documentType: "Other" }));

          if (uploads.length > 0) {
            setIsUploading(true);
            try {
              for (const u of uploads) await uploadFile(claimId, u.file, u.documentType);
              toast({ title: "Claim created with documents", description: `${uploads.length} file(s) uploaded.` });
            } catch {
              toast({ variant: "destructive", title: "Claim saved but some files failed to upload", description: "You can upload remaining documents from the claim detail page." });
            } finally {
              setIsUploading(false);
            }
          } else {
            toast({ title: "Claim created successfully" });
          }
          setLocation(`/claims/${claimId}`);
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Failed to create claim", description: err.message });
        },
      }
    );
  };

  const isBusy = createMutation.isPending || isUploading;

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href="/claims" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-600 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Claims
        </Link>
        <h1 className="text-2xl font-display font-bold text-slate-900">Create New Claim</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in the details below to initiate a new IT asset insurance claim.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-base font-display font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Employee ID *" name="employeeId" value={formData.employeeId} onChange={handleChange} required />
            <InputField label="Employee Name *" name="employeeName" value={formData.employeeName} onChange={handleChange} required />

            {/* Asset Code with inline auto-fetch */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Asset Code / Asset No *</label>
              <div className="relative">
                <input
                  className={cn(
                    "input-base pr-10",
                    assetLookupStatus === "found" && "border-emerald-400 focus:border-emerald-500",
                    assetLookupStatus === "not_found" && "border-amber-400 focus:border-amber-500"
                  )}
                  name="assetCode"
                  value={formData.assetCode}
                  onChange={handleChange}
                  required
                  placeholder="Type or paste Asset No / Inventory No — details will auto-fill"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {assetLookupStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  {assetLookupStatus === "found" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {assetLookupStatus === "not_found" && <AlertCircle className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
              {assetLookupStatus === "found" && assetInfo && (
                <div className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium">Asset found — details auto-filled</span>
                  {assetInfo.policyNumber && <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">Policy: {assetInfo.policyNumber}</span>}
                </div>
              )}
              {assetLookupStatus === "not_found" && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Asset not found in the active policy — you can fill in the details manually.
                </p>
              )}
            </div>

            <InputField label="Asset Type" name="assetType" value={formData.assetType} onChange={handleChange} placeholder="e.g. Laptop, Desktop" />
            <InputField label="Serial No" name="serialNo" value={formData.serialNo} onChange={handleChange} />
            <InputField label="Model" name="model" value={formData.model} onChange={handleChange} />
            {formData.policyNumber && (
              <InputField label="Policy Number" name="policyNumber" value={formData.policyNumber} onChange={handleChange} />
            )}
          </div>
        </div>

        {/* Incident & Financial Details */}
        <div className="card p-6">
          <h2 className="text-base font-display font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5">Incident & Financial Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Damage Date" type="date" name="damageDate" value={formData.damageDate} onChange={handleChange} />
            <InputField label="Repair Date" type="date" name="repairDate" value={formData.repairDate} onChange={handleChange} />
            <SelectField label="Affected Part" name="effectedPart" value={formData.effectedPart} onChange={handleChange} options={effectedPartOptions} placeholder="Select affected part" />
            <InputField label="Case ID" name="caseId" value={formData.caseId} onChange={handleChange} />
            <InputField label="Payable Amount (₹)" type="number" step="0.01" name="payableAmount" value={formData.payableAmount} onChange={handleChange} />
            <InputField label="Recover Amount (₹)" type="number" step="0.01" name="recoverAmount" value={formData.recoverAmount} onChange={handleChange} />
            <InputField label="File Charge (₹)" type="number" step="0.01" name="fileCharge" value={formData.fileCharge} onChange={handleChange} />
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Remark</label>
              <textarea name="remark" value={formData.remark} onChange={handleChange} rows={4} className="input-base" />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="card p-6">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <h2 className="text-base font-display font-bold text-slate-900">Attachments</h2>
            <p className="text-sm text-slate-500 mt-1">Upload supporting documents.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SingleFileUpload label="Damage Images" description="Upload a ZIP archive of damage photos" accept=".zip,application/zip,application/x-zip-compressed" file={attachments.damageImages} onChange={(f) => setAttachments((p) => ({ ...p, damageImages: f }))} />
            <SingleFileUpload label="Repair Images" description="Upload a ZIP archive of repair photos" accept=".zip,application/zip,application/x-zip-compressed" file={attachments.repairImages} onChange={(f) => setAttachments((p) => ({ ...p, repairImages: f }))} />
            <SingleFileUpload label="Quotation" description="PDF, JPG, or PNG — single file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" file={attachments.quotation} onChange={(f) => setAttachments((p) => ({ ...p, quotation: f }))} />
            <SingleFileUpload label="Invoice" description="PDF, JPG, or PNG — single file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" file={attachments.invoice} onChange={(f) => setAttachments((p) => ({ ...p, invoice: f }))} />
            <SingleFileUpload label="Claim Form" description="PDF, JPG, or PNG — single file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" file={attachments.claimForm} onChange={(f) => setAttachments((p) => ({ ...p, claimForm: f }))} />
            <MultiFileUpload label="Other Supporting Documents" description="PDF, JPG, or PNG — multiple files allowed" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" files={attachments.otherDocuments} onChange={(files) => setAttachments((p) => ({ ...p, otherDocuments: files }))} />
          </div>
          {(() => {
            const count = (attachments.damageImages ? 1 : 0) + (attachments.repairImages ? 1 : 0) + (attachments.quotation ? 1 : 0) + (attachments.invoice ? 1 : 0) + (attachments.claimForm ? 1 : 0) + attachments.otherDocuments.length;
            if (count === 0) return null;
            return (
              <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-700">{count} file{count !== 1 ? "s" : ""} ready to upload with this claim</span>
              </div>
            );
          })()}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/claims" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={isBusy} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {isBusy ? (<><Loader2 className="w-4 h-4 animate-spin" />{isUploading ? "Uploading…" : "Saving…"}</>) : (<><Save className="w-4 h-4" />Save Claim</>)}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

function InputField({ label, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <input className="input-base" {...props} />
    </div>
  );
}

function SelectField({ label, options, placeholder, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <select className="input-base" {...props}>
        <option value="">{placeholder}</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
