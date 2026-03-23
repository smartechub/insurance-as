import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetUsers, useCreateUser, useDeleteUser, useGetMe, UserRole } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Trash2, Plus, X, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function Users() {
  const { data: users, isLoading } = useGetUsers();
  const { data: currentUser } = useGetMe();
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: UserRole.user });

  if (currentUser?.role !== 'admin') {
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
    createMutation.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "User created" });
        setIsModalOpen(false);
        setFormData({ name: "", email: "", password: "", role: UserRole.user });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message })
    });
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete this user?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "User deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        }
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display text-slate-900 mb-2">User Management</h1>
          <p className="text-slate-500">Manage system access and roles.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 primary-gradient px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" /> Add User
        </button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr> :
              users?.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900">{user.name}</td>
                  <td className="p-4 text-slate-600">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {user.id !== currentUser.id && (
                      <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold font-display text-slate-900">Create New User</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary outline-none appearance-none">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={createMutation.isPending} className="w-full primary-gradient py-3.5 rounded-xl font-bold">
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
