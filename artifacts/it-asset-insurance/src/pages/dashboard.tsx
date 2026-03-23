import { AppLayout } from "@/components/layout/AppLayout";
import { useGetClaimStats } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { 
  FileStack, 
  Clock, 
  CheckCircle2, 
  Ban,
  TrendingUp,
  Activity
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#64748B'];
const STATUS_MAP = {
  'Pending': '#F59E0B',
  'Processing': '#3B82F6',
  'Approved': '#10B981',
  'Rejected': '#EF4444',
  'Settled': '#64748B'
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetClaimStats();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const pieData = stats?.claimsByStatus?.map(s => ({
    name: s.status,
    value: s.count
  })) || [];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display text-slate-900 mb-2">Dashboard Overview</h1>
        <p className="text-slate-500">Real-time metrics and analytics for your IT asset claims.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Claims" 
          value={stats?.total || 0} 
          icon={<FileStack className="w-6 h-6 text-indigo-600" />} 
          bg="bg-indigo-100" 
        />
        <StatCard 
          title="Pending Review" 
          value={stats?.pending || 0} 
          icon={<Clock className="w-6 h-6 text-amber-600" />} 
          bg="bg-amber-100" 
        />
        <StatCard 
          title="Currently Processing" 
          value={stats?.processing || 0} 
          icon={<Activity className="w-6 h-6 text-blue-600" />} 
          bg="bg-blue-100" 
        />
        <StatCard 
          title="Successfully Settled" 
          value={stats?.settled || 0} 
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} 
          bg="bg-emerald-100" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bar Chart */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold font-display text-slate-800">Claims by Month</h3>
            <div className="p-2 bg-slate-50 rounded-lg"><TrendingUp className="w-5 h-5 text-slate-400" /></div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.claimsByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} dx={-10} />
                <Tooltip 
                  cursor={{fill: '#F1F5F9'}} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card rounded-3xl p-6">
          <h3 className="text-xl font-bold font-display text-slate-800 mb-6">Status Distribution</h3>
          <div className="h-[250px] w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_MAP[entry.name as keyof typeof STATUS_MAP] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400">No data available</div>
            )}
          </div>
          
          <div className="mt-4 space-y-3">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_MAP[entry.name as keyof typeof STATUS_MAP] || COLORS[index] }} />
                  <span className="text-sm font-medium text-slate-700">{entry.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon, bg }: { title: string, value: number, icon: React.ReactNode, bg: string }) {
  return (
    <div className="glass-card rounded-3xl p-6 flex items-center gap-4 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-display font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
