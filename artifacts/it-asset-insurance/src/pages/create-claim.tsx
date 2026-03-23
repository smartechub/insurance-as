import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateClaim, AssetType } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function CreateClaim() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateClaim();

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
    remark: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert strings to numbers where required
    const payload = {
      ...formData,
      payableAmount: formData.payableAmount ? parseFloat(formData.payableAmount) : undefined,
      recoverAmount: formData.recoverAmount ? parseFloat(formData.recoverAmount) : undefined,
      fileCharge: formData.fileCharge ? parseFloat(formData.fileCharge) : undefined,
    };

    createMutation.mutate({ data: payload as any }, {
      onSuccess: (data) => {
        toast({ title: "Claim created successfully" });
        setLocation(`/claims/${data.id}`);
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to create claim", description: err.message });
      }
    });
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <Link href="/claims" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Claims
        </Link>
        <h1 className="text-3xl font-display text-slate-900 mb-2">Create New Claim</h1>
        <p className="text-slate-500">Enter the details below to initiate a new IT asset insurance claim.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="glass-card rounded-3xl p-8">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-4 mb-6">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Employee ID *" name="employeeId" value={formData.employeeId} onChange={handleChange} required />
            <InputField label="Employee Name *" name="employeeName" value={formData.employeeName} onChange={handleChange} required />
            <InputField label="Asset Code *" name="assetCode" value={formData.assetCode} onChange={handleChange} required />
            <SelectField label="Asset Type" name="assetType" value={formData.assetType} onChange={handleChange} options={Object.values(AssetType)} />
            <InputField label="Serial No" name="serialNo" value={formData.serialNo} onChange={handleChange} />
          </div>
        </div>

        <div className="glass-card rounded-3xl p-8">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-4 mb-6">Incident & Financial Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Damage Date" type="date" name="damageDate" value={formData.damageDate} onChange={handleChange} />
            <InputField label="Repair Date" type="date" name="repairDate" value={formData.repairDate} onChange={handleChange} />
            <InputField label="Effected Part" name="effectedPart" value={formData.effectedPart} onChange={handleChange} />
            <InputField label="Case ID" name="caseId" value={formData.caseId} onChange={handleChange} />
            <InputField label="Payable Amount ($)" type="number" step="0.01" name="payableAmount" value={formData.payableAmount} onChange={handleChange} />
            <InputField label="Recover Amount ($)" type="number" step="0.01" name="recoverAmount" value={formData.recoverAmount} onChange={handleChange} />
            <InputField label="File Charge ($)" type="number" step="0.01" name="fileCharge" value={formData.fileCharge} onChange={handleChange} />
            
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

        <div className="flex justify-end gap-4">
          <Link href="/claims" className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button 
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 primary-gradient px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Claim
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
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
