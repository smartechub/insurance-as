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
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={formData[key] as string}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        className="input-base"
      />
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system access and employee profiles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadSampleCSV} className="btn-secondary">
            <FileDown className="w-4 h-4" /> Sample CSV
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={isBulkUploading} className="btn-secondary disabled:opacity-50">
            {isBulkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Bulk Upload
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
          <button onClick={() => exportToCSV(users ?? [])} disabled={!users?.length} className="btn-secondary disabled:opacity-40">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : users?.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-slate-400">No users found.</td></tr>
              ) : (
                users?.map((user) => {
                  const rawInitials = (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");
                  const initials = rawInitials || (user.name?.[0]?.toUpperCase() ?? "U");
                  const fullName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold font-display shrink-0">
                            {initials.toUpperCase()}
                          </div>
                          <span className="font-semibold text-sm text-slate-900">{fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-slate-500">{user.employeeId || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{user.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${user.role === "admin" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-100 text-slate-600"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{user.designation || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{user.department || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-right">
                        {user.id !== currentUser?.id && (
                          <button onClick={() => handleDelete(user.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-70 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl w-full max-w-2xl shadow-2xl shadow-slate-900/20 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-base font-display font-bold text-slate-900">Add New User</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Fill in the details below to create a new account.</p>
                </div>
                <button
                  onClick={() => { setIsModalOpen(false); setFormData(EMPTY_FORM); }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {field("First Name", "firstName", "text", true)}
                  {field("Last Name", "lastName", "text", true)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {field("Employee ID", "employeeId")}
                  {field("Email", "email", "email", true)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="input-base appearance-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {field("Password", "password", "password", true)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {field("Designation", "designation")}
                  {field("Department", "department")}
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full btn-primary justify-center"
                  >
                    {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create User"}
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
