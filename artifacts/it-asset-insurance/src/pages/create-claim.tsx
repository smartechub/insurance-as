import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateClaim, AssetType } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, UploadCloud, X, FileText, Archive, Image as ImageIcon, FileCheck, Eye } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface AttachmentState {
  damageImages: File | null;
  repairImages: File | null;
  quotation: File | null;
  invoice: File | null;
  claimForm: File | null;
  otherDocuments: File[];
}

interface FilePreview {
  file: File;
  previewUrl?: string;
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return <ImageIcon className="w-5 h-5" />;
  if (file.type === "application/pdf") return <FileText className="w-5 h-5" />;
  return <Archive className="w-5 h-5" />;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function FilePreviewCard({
  file,
  onRemove,
  onPreview,
}: {
  file: File;
  onRemove: () => void;
  onPreview?: () => void;
}) {
  const previewUrl = isImageFile(file) ? URL.createObjectURL(file) : undefined;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white group hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-primary flex-shrink-0 overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} alt={file.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          getFileIcon(file)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {previewUrl && (
          <button
            type="button"
            onClick={onPreview}
            title="Preview"
            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SingleFileUpload({
  label,
  description,
  accept,
  file,
  onChange,
}: {
  label: string;
  description?: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewUrl = file && isImageFile(file) ? URL.createObjectURL(file) : undefined;

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      {description && <p className="text-xs text-slate-400 mb-2">{description}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          onChange(f);
          e.target.value = "";
        }}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-primary hover:bg-primary/5 transition-all text-slate-400 hover:text-primary"
        >
          <UploadCloud className="w-6 h-6" />
          <span className="text-sm font-medium">Click to select file</span>
        </button>
      ) : (
        <div className="space-y-2">
          <FilePreviewCard
            file={file}
            onRemove={() => onChange(null)}
            onPreview={() => setPreviewOpen(true)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Replace file
          </button>
        </div>
      )}

      {previewOpen && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewUrl} alt={file.name} className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function MultiFileUpload({
  label,
  description,
  accept,
  files,
  onChange,
}: {
  label: string;
  description?: string;
  accept: string;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const previewUrl = previewFile && isImageFile(previewFile) ? URL.createObjectURL(previewFile) : undefined;

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    onChange([...files, ...arr]);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      {description && <p className="text-xs text-slate-400 mb-2">{description}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center gap-2 py-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-primary hover:bg-primary/5 transition-all text-slate-400 hover:text-primary mb-3"
      >
        <UploadCloud className="w-6 h-6" />
        <span className="text-sm font-medium">
          {files.length === 0 ? "Click to select files" : "Add more files"}
        </span>
      </button>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <FilePreviewCard
              key={i}
              file={file}
              onRemove={() => removeFile(i)}
              onPreview={() => setPreviewFile(file)}
            />
          ))}
        </div>
      )}

      {previewFile && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewFile(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewUrl} alt={previewFile.name} className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateClaim() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateClaim();
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    assetCode: "",
    assetType: "Laptop" as AssetType,
    serialNo: "",
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const uploadFile = async (claimId: number, file: File, documentType: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentType", documentType);
    const res = await fetch(`/api/documents/upload/${claimId}`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
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

          if (attachments.damageImages)
            uploads.push({ file: attachments.damageImages, documentType: "Damage Images" });
          if (attachments.repairImages)
            uploads.push({ file: attachments.repairImages, documentType: "Repair Images" });
          if (attachments.quotation)
            uploads.push({ file: attachments.quotation, documentType: "Quotation" });
          if (attachments.invoice)
            uploads.push({ file: attachments.invoice, documentType: "Invoice" });
          if (attachments.claimForm)
            uploads.push({ file: attachments.claimForm, documentType: "Claim Form" });
          attachments.otherDocuments.forEach((file) =>
            uploads.push({ file, documentType: "Other" })
          );

          if (uploads.length > 0) {
            setIsUploading(true);
            try {
              for (const u of uploads) {
                await uploadFile(claimId, u.file, u.documentType);
              }
              toast({ title: "Claim created with documents", description: `${uploads.length} file(s) uploaded.` });
            } catch {
              toast({
                variant: "destructive",
                title: "Claim saved but some files failed to upload",
                description: "You can upload remaining documents from the claim detail page.",
              });
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
      <div className="mb-8">
        <Link
          href="/claims"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Claims
        </Link>
        <h1 className="text-3xl font-display text-slate-900 mb-2">Create New Claim</h1>
        <p className="text-slate-500">
          Enter the details below to initiate a new IT asset insurance claim.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="glass-card rounded-3xl p-8">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-4 mb-6">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Employee ID *" name="employeeId" value={formData.employeeId} onChange={handleChange} required />
            <InputField label="Employee Name *" name="employeeName" value={formData.employeeName} onChange={handleChange} required />
            <InputField label="Asset Code *" name="assetCode" value={formData.assetCode} onChange={handleChange} required />
            <SelectField label="Asset Type" name="assetType" value={formData.assetType} onChange={handleChange} options={Object.values(AssetType)} />
            <InputField label="Serial No" name="serialNo" value={formData.serialNo} onChange={handleChange} />
          </div>
        </div>

        {/* Incident & Financial Details */}
        <div className="glass-card rounded-3xl p-8">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-4 mb-6">
            Incident & Financial Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Damage Date" type="date" name="damageDate" value={formData.damageDate} onChange={handleChange} />
            <InputField label="Repair Date" type="date" name="repairDate" value={formData.repairDate} onChange={handleChange} />
            <InputField label="Effected Part" name="effectedPart" value={formData.effectedPart} onChange={handleChange} />
            <InputField label="Case ID" name="caseId" value={formData.caseId} onChange={handleChange} />
            <InputField label="Payable Amount (₹)" type="number" step="0.01" name="payableAmount" value={formData.payableAmount} onChange={handleChange} />
            <InputField label="Recover Amount (₹)" type="number" step="0.01" name="recoverAmount" value={formData.recoverAmount} onChange={handleChange} />
            <InputField label="File Charge (₹)" type="number" step="0.01" name="fileCharge" value={formData.fileCharge} onChange={handleChange} />

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Remark</label>
              <textarea
                name="remark"
                value={formData.remark}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="glass-card rounded-3xl p-8">
          <div className="border-b border-slate-200 pb-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Attachments</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload supporting documents. Images can be previewed before submitting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Damage Images */}
            <SingleFileUpload
              label="Damage Images"
              description="Upload a ZIP archive of damage photos"
              accept=".zip,application/zip,application/x-zip-compressed"
              file={attachments.damageImages}
              onChange={(f) => setAttachments((p) => ({ ...p, damageImages: f }))}
            />

            {/* Repair Images */}
            <SingleFileUpload
              label="Repair Images"
              description="Upload a ZIP archive of repair photos"
              accept=".zip,application/zip,application/x-zip-compressed"
              file={attachments.repairImages}
              onChange={(f) => setAttachments((p) => ({ ...p, repairImages: f }))}
            />

            {/* Quotation */}
            <SingleFileUpload
              label="Quotation"
              description="PDF, JPG, or PNG — single file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              file={attachments.quotation}
              onChange={(f) => setAttachments((p) => ({ ...p, quotation: f }))}
            />

            {/* Invoice */}
            <SingleFileUpload
              label="Invoice"
              description="PDF, JPG, or PNG — single file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              file={attachments.invoice}
              onChange={(f) => setAttachments((p) => ({ ...p, invoice: f }))}
            />

            {/* Claim Form */}
            <SingleFileUpload
              label="Claim Form"
              description="PDF, JPG, or PNG — single file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              file={attachments.claimForm}
              onChange={(f) => setAttachments((p) => ({ ...p, claimForm: f }))}
            />

            {/* Other Documents */}
            <MultiFileUpload
              label="Other Supporting Documents"
              description="PDF, JPG, or PNG — multiple files allowed"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              files={attachments.otherDocuments}
              onChange={(files) => setAttachments((p) => ({ ...p, otherDocuments: files }))}
            />
          </div>

          {/* Upload summary */}
          {(() => {
            const count =
              (attachments.damageImages ? 1 : 0) +
              (attachments.repairImages ? 1 : 0) +
              (attachments.quotation ? 1 : 0) +
              (attachments.invoice ? 1 : 0) +
              (attachments.claimForm ? 1 : 0) +
              attachments.otherDocuments.length;
            if (count === 0) return null;
            return (
              <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-700">
                  {count} file{count !== 1 ? "s" : ""} ready to upload with this claim
                </span>
              </div>
            );
          })()}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/claims"
            className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isBusy}
            className="flex items-center gap-2 primary-gradient px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isUploading ? "Uploading files…" : "Saving…"}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Claim
              </>
            )}
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
      <input
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-900 font-medium"
        {...props}
      />
    </div>
  );
}

function SelectField({ label, options, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <select
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-900 font-medium appearance-none"
        {...props}
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
