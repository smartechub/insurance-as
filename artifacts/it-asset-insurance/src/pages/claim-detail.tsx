import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetClaimById, useUpdateClaim, useGetDocumentsByClaim, useDeleteDocument, ClaimStatus } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { formatCurrency, cn } from "@/lib/utils";
import { ArrowLeft, Edit2, CheckCircle, FileText, UploadCloud, X, Loader2, Image as ImageIcon, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function ClaimDetail() {
  const [, params] = useRoute("/claims/:id");
  const id = parseInt(params?.id || "0");
  const { data: claim, isLoading } = useGetClaimById(id);
  const { data: documents, isLoading: docsLoading } = useGetDocumentsByClaim(id);
  
  const [activeTab, setActiveTab] = useState<'details'|'documents'>('details');

  if (isLoading) return <AppLayout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;
  if (!claim) return <AppLayout>Claim not found</AppLayout>;

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
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('details')}
          className={cn("px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
            activeTab === 'details' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
        >
          Claim Details
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={cn("px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
            activeTab === 'documents' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
        >
          Documents {documents?.length ? `(${documents.length})` : ""}
        </button>
      </div>

      {activeTab === 'details' && (
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
              <DetailRow label="Damage Date" value={claim.damageDate ? new Date(claim.damageDate).toLocaleDateString() : 'N/A'} />
              <DetailRow label="Repair Date" value={claim.repairDate ? new Date(claim.repairDate).toLocaleDateString() : 'N/A'} />
              <DetailRow label="Effected Part" value={claim.effectedPart} />
              <DetailRow label="Case ID" value={claim.caseId} />
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-500 mb-1">Remark</p>
                <p className="text-slate-900 bg-slate-50 p-4 rounded-xl leading-relaxed">{claim.remark || 'No remark provided.'}</p>
              </div>
            </DetailCard>
          </div>

          <div className="space-y-6">
            <DetailCard title="Financials">
              <DetailRow label="Payable Amount" value={formatCurrency(claim.payableAmount)} highlight />
              <DetailRow label="Recover Amount" value={formatCurrency(claim.recoverAmount)} />
              <DetailRow label="File Charge" value={formatCurrency(claim.fileCharge)} />
            </DetailCard>
            
            <DetailCard title="System Details">
              <DetailRow label="Created At" value={claim.createdAt ? new Date(claim.createdAt).toLocaleString() : 'N/A'} />
              <DetailRow label="Last Updated" value={claim.updatedAt ? new Date(claim.updatedAt).toLocaleString() : 'N/A'} />
            </DetailCard>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <DocumentManager claimId={id} documents={documents || []} />
      )}
    </AppLayout>
  );
}

function DetailCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-display font-bold text-slate-700 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">{title}</h2>
      <div className="space-y-3.5">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight = false }: { label: string, value: any, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className={cn("text-right font-medium text-slate-900", highlight && "text-xl font-bold text-primary")}>
        {value || '-'}
      </span>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
    case 'Settled': return 'bg-slate-100 text-slate-800 border-slate-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

// Document Management Sub-component
function DocumentManager({ claimId, documents }: { claimId: number, documents: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('Quotation');
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

  const deleteDocMutation = useDeleteDocument();
  
  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File, documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      
      const res = await fetch(`/api/documents/upload/${claimId}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/claim/${claimId}`] });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to upload document" })
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate({ file: e.target.files[0], documentType: docType });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteDocId == null) return;
    deleteDocMutation.mutate({ id: deleteDocId }, {
      onSuccess: () => {
        toast({ title: "Document deleted" });
        queryClient.invalidateQueries({ queryKey: [`/api/documents/claim/${claimId}`] });
        setDeleteDocId(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete document" });
        setDeleteDocId(null);
      },
    });
  };

  const docCategories = ['Damage Images', 'Repair Images', 'Quotation', 'Invoice', 'Claim Form', 'Other'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="card p-5 sticky top-8">
          <h3 className="text-sm font-display font-bold text-slate-700 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">Upload New</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Document Type</label>
              <select 
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="input-base appearance-none"
              >
                {docCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
              {documents.map(doc => (
                <div key={doc.id} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all bg-white group">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-primary">
                    {doc.fileType?.includes('image') ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate" title={doc.fileName}>{doc.fileName}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{doc.documentType || 'Document'}</p>
                    <div className="flex gap-2 mt-3">
                      <a href={`/api/documents/file/${doc.filePath}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary hover:text-white transition-colors">
                        View
                      </a>
                      <button onClick={() => setDeleteDocId(doc.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
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
