import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetUsers, useCreateUser, useDeleteUser, useGetMe, useResetUserPassword, UserRole } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Shield, Trash2, Plus, X, Loader2, Download, Upload, FileDown,
  KeyRound, Eye, EyeOff, RefreshCw, Copy, CheckCircle2, Wand2
} from "lucide-react";
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
    u.firstName ?? "", u.lastName ?? "", u.employeeId ?? "", u.email,
    u.role, u.designation ?? "", u.department ?? "",
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "users.csv"; a.click();
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
  a.href = url; a.download = "users_sample.csv"; a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Users() {
  const { data: users, isLoading } = useGetUsers();
  const { data: currentUser } = useGetMe();
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const resetPasswordMutation = useResetUserPassword();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [autoGenPassword, setAutoGenPassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const [createdPasswordInfo, setCreatedPasswordInfo] = useState<{ name: string; email: string; password: string } | null>(null);

  const [resetModalUser, setResetModalUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [resetAutoGen, setResetAutoGen] = useState(true);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetResult, setResetResult] = useState<{ password: string } | null>(null);

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
          role: formData.role,
          employeeId: formData.employeeId || undefined,
          designation: formData.designation || undefined,
          department: formData.department || undefined,
          ...(autoGenPassword ? { autoGeneratePassword: true } : { password: formData.password }),
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setIsModalOpen(false);
          setFormData(EMPTY_FORM);
          setAutoGenPassword(true);
          setShowPassword(false);
          const name = `${formData.firstName} ${formData.lastName}`.trim();
          if ((data as any).temporaryPassword) {
            setCreatedPasswordInfo({
              name,
              email: formData.email,
              password: (data as any).temporaryPassword,
            });
          } else {
            toast({ title: "User created successfully", description: `An email has been sent to ${formData.email}` });
          }
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

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    resetPasswordMutation.mutate(
      {
        id: resetModalUser.id,
        data: {
          ...(resetAutoGen ? { autoGeneratePassword: true } : { newPassword: resetNewPassword }),
        },
      },
      {
        onSuccess: (data) => {
          if ((data as any).temporaryPassword) {
            setResetResult({ password: (data as any).temporaryPassword });
          } else {
            toast({ title: "Password reset", description: `Password updated and email sent to ${resetModalUser.email}` });
            setResetModalUser(null);
            setResetNewPassword("");
            setResetAutoGen(true);
          }
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err.message });
        },
      }
    );
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsBulkUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/bulk-upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Upload failed", description: data.error });
      } else {
        toast({
          title: "Bulk upload complete",
          description: `${data.created} created, ${data.skipped} skipped${data.errors.length ? `, ${data.errors.length} errors` : ""}. Welcome emails sent.`,
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
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setResetModalUser({ id: user.id, name: fullName ?? user.name, email: user.email });
                              setResetAutoGen(true);
                              setResetNewPassword("");
                              setResetResult(null);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Reset password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button onClick={() => handleDelete(user.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
                  <p className="text-xs text-slate-500 mt-0.5">An email with credentials will be sent to the user.</p>
                </div>
                <button
                  onClick={() => { setIsModalOpen(false); setFormData(EMPTY_FORM); setAutoGenPassword(true); setShowPassword(false); }}
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setAutoGenPassword(true)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors border ${
                          autoGenPassword
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <Wand2 className="w-3.5 h-3.5" /> Auto-generate
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenPassword(false)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors border ${
                          !autoGenPassword
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Set manually
                      </button>
                    </div>
                    {autoGenPassword ? (
                      <div className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-600 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" />
                        A secure password will be auto-generated and emailed.
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required={!autoGenPassword}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="input-base pr-9"
                          placeholder="Min. 6 characters"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
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
                    {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create User & Send Email"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generated Password Info Modal (after user creation with auto-gen) */}
      <AnimatePresence>
        {createdPasswordInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl w-full max-w-md shadow-2xl shadow-slate-900/20 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900">User Created Successfully</h3>
                    <p className="text-xs text-slate-500">A welcome email has been sent to the user.</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Note this password</p>
                  <p className="text-xs text-amber-700 mb-3">This is the auto-generated password. Save it somewhere safe — it won't be shown again.</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white rounded border border-amber-200 px-3 py-2">
                      <span className="text-xs text-slate-500 font-medium">User</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-slate-700">{createdPasswordInfo.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded border border-amber-200 px-3 py-2">
                      <span className="text-xs text-slate-500 font-medium">Email</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-slate-700">{createdPasswordInfo.email}</span>
                        <CopyButton text={createdPasswordInfo.email} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded border border-amber-200 px-3 py-2">
                      <span className="text-xs text-slate-500 font-medium">Password</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-mono font-bold text-indigo-700 tracking-wider">{createdPasswordInfo.password}</span>
                        <CopyButton text={createdPasswordInfo.password} />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCreatedPasswordInfo(null)}
                  className="w-full btn-primary justify-center"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl w-full max-w-md shadow-2xl shadow-slate-900/20 overflow-hidden"
            >
              {resetResult ? (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-slate-900">Password Reset</h3>
                      <p className="text-xs text-slate-500">A notification email has been sent to the user.</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">New Password</p>
                    <p className="text-xs text-blue-600 mb-3">Share this securely with <strong>{resetModalUser.name}</strong> and ask them to change it after logging in.</p>
                    <div className="flex items-center justify-between bg-white rounded border border-blue-200 px-3 py-2.5">
                      <span className="text-sm font-mono font-bold text-indigo-700 tracking-wider">{resetResult.password}</span>
                      <CopyButton text={resetResult.password} />
                    </div>
                  </div>
                  <button
                    onClick={() => { setResetModalUser(null); setResetResult(null); setResetNewPassword(""); setResetAutoGen(true); }}
                    className="w-full btn-primary justify-center"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-display font-bold text-slate-900">Reset Password</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{resetModalUser.name} · {resetModalUser.email}</p>
                    </div>
                    <button
                      onClick={() => { setResetModalUser(null); setResetNewPassword(""); setResetAutoGen(true); setResetResult(null); }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Password Method
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setResetAutoGen(true)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors border ${
                            resetAutoGen
                              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          <Wand2 className="w-3.5 h-3.5" /> Auto-generate
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetAutoGen(false)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors border ${
                            !resetAutoGen
                              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Set manually
                        </button>
                      </div>
                    </div>

                    {resetAutoGen ? (
                      <div className="px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-600 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" />
                        A secure password will be generated. User will receive an email notification.
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                          New Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showResetPass ? "text" : "password"}
                            required
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            className="input-base pr-9"
                            placeholder="Min. 6 characters"
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPass(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">User will receive an email with the new password.</p>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={resetPasswordMutation.isPending}
                        className="w-full btn-primary justify-center"
                      >
                        {resetPasswordMutation.isPending
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
                          : <><KeyRound className="w-4 h-4" /> Reset Password & Notify User</>
                        }
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
