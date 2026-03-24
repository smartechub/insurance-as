import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetUsers, useCreateUser, useDeleteUser, useGetMe, UserRole } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Trash2, Plus, X, Loader2, Download, Upload, FileDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  employeeId: "",
  email: "",
  password: "",
  role: UserRole.user,
  designation: "",
  department: "",
};

const DEPARTMENTS = [
  "IT", "Finance", "HR", "Operations", "Sales", "Marketing", "Legal", "Engineering", "Other"
];

function exportToCSV(users: any[]) {
  const headers = ["First Name", "Last Name", "Employee ID", "Email", "Role", "Designation", "Department"];
  const rows = users.map(u => [
    u.firstName ?? "",
    u.lastName ?? "",
    u.employeeId ?? "",
    u.email,
    u.role,
    u.designation ?? "",
    u.department ?? "",
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadSampleCSV() {
  const headers = ["First Name", "Last Name", "Employee ID", "Email", "Role", "Designation", "Department"];
  const sample = [
    ["John", "Smith", "EMP001", "john.smith@company.com", "user", "Software Engineer", "IT"],
    ["Jane", "Doe", "EMP002", "jane.doe@company.com", "admin", "IT Manager", "IT"],
  ];
  const rows = sample.map(r => r.map(v => `"${v}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users_sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Users() {
  const { data: users, isLoading } = useGetUsers();
  const { data: currentUser } = useGetMe();
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  if (currentUser?.role !== "admin") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <Shield className="w-16 h-16 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold font-display text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500">You must be an administrator to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          employeeId: formData.employeeId || undefined,
          designation: formData.designation || undefined,
          department: formData.department || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "User created successfully" });
          setIsModalOpen(false);
          setFormData(EMPTY_FORM);
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: (err) =>
          toast({ variant: "destructive", title: "Error", description: err.message }),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "User deleted" });
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          },
        }
      );
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsBulkUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/bulk-upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Upload failed", description: data.error });
      } else {
        toast({
          title: "Bulk upload complete",
          description: `${data.created} created, ${data.skipped} skipped${data.errors.length ? `, ${data.errors.length} errors` : ""}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      }
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Network error" });
    } finally {
      setIsBulkUploading(false);
    }
  };

  const field = (label: string, key: keyof typeof formData, type = "text", required = false) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={formData[key] as string}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-primary outline-none text-sm"
      />
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display text-slate-900 mb-2">User Management</h1>
          <p className="text-slate-500">Manage system access and employee profiles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadSampleCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary font-semibold text-sm transition-all"
          >
            <FileDown className="w-4 h-4" /> Sample CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isBulkUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary font-semibold text-sm transition-all disabled:opacity-50"
          >
            {isBulkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Bulk Upload
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
          <button
            onClick={() => exportToCSV(users ?? [])}
            disabled={!users?.length}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary font-semibold text-sm transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 primary-gradient px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Name</th>
                <th className="p-4">Employee ID</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Department</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : users?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">No users found.</td>
                </tr>
              ) : (
                users?.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.name}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{user.employeeId || <span className="text-slate-300">—</span>}</td>
                    <td className="p-4 text-slate-600 text-sm">{user.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{user.designation || <span className="text-slate-300">—</span>}</td>
                    <td className="p-4 text-slate-600 text-sm">{user.department || <span className="text-slate-300">—</span>}</td>
                    <td className="p-4 text-right">
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-xl font-bold font-display text-slate-900">Add New User</h3>
                <button
                  onClick={() => { setIsModalOpen(false); setFormData(EMPTY_FORM); }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {field("First Name", "firstName", "text", true)}
                  {field("Last Name", "lastName", "text", true)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {field("Employee ID", "employeeId")}
                  {field("Email ID", "email", "email", true)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-primary outline-none text-sm appearance-none bg-white"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {field("Password", "password", "password", true)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {field("Designation", "designation")}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-primary outline-none text-sm appearance-none bg-white"
                    >
                      <option value="">Select department</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pt-2 shrink-0">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full primary-gradient py-3 rounded-xl font-bold text-sm"
                  >
                    {createMutation.isPending ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
