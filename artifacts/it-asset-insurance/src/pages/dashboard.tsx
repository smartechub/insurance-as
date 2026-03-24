import { AppLayout } from "@/components/layout/AppLayout";
import { useGetClaimStats } from "@workspace/api-client-react";
import { FileStack, Clock, CheckCircle2, Activity, TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  Pending: "#F59E0B",
  Processing: "#6366F1",
  Approved: "#10B981",
  Rejected: "#EF4444",
  Settled: "#64748B",
};

const STAT_CARDS = [
  { key: "total", label: "Total Claims", icon: FileStack, color: "indigo", iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
  { key: "pending", label: "Pending Review", icon: Clock, color: "amber", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  { key: "processing", label: "In Processing", icon: Activity, color: "blue", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  { key: "settled", label: "Settled", icon: CheckCircle2, color: "green", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xl shadow-slate-900/10">
        <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
        <p className="text-lg font-bold text-slate-900">{payload[0].value} <span className="text-sm font-normal text-slate-400">claims</span></p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetClaimStats();

  const pieData = stats?.claimsByStatus?.filter(s => s.count > 0).map(s => ({
    name: s.status, value: s.count,
  })) ?? [];

  const totalSettledOrApproved = (stats?.settled ?? 0) + (stats?.approved ?? 0);
  const total = stats?.total ?? 0;
  const resolutionRate = total > 0 ? Math.round((totalSettledOrApproved / total) * 100) : 0;

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time analytics for your IT asset insurance claims.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live data
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((card) => {
          const val = (stats as any)?.[card.key] ?? 0;
          const Icon = card.icon;
          return (
            <div key={card.key} className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                {isLoading ? (
                  <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse mb-1" />
                ) : (
                  <div className="text-3xl font-display font-bold text-slate-900">{val}</div>
                )}
                <div className="text-xs font-medium text-slate-500 mt-0.5">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Bar Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-bold text-slate-900">Monthly Claim Volume</h3>
              <p className="text-xs text-slate-400 mt-0.5">Number of claims filed per month</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Trend
            </div>
          </div>
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.claimsByMonth ?? []} barSize={28} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false}
                    tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "Inter" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "Inter" }} dx={-4} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC", radius: 6 }} />
                  <Bar dataKey="count" fill="#6366F1" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Donut Chart */}
        <div className="card p-6">
          <div className="mb-5">
            <h3 className="font-display font-bold text-slate-900">Status Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Claims by current status</p>
          </div>
          {isLoading ? (
            <div className="h-[180px] flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            </div>
          ) : pieData.length > 0 ? (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={74}
                      paddingAngle={3} dataKey="value" stroke="none">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] ?? "#94A3B8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E2E8F0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2.5">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[entry.name] ?? "#94A3B8" }} />
                      <span className="text-xs font-medium text-slate-600">{entry.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex flex-col items-center justify-center gap-2 text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <span className="text-sm">No data available</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row — summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-slate-900">{stats?.rejected ?? 0}</div>
            <div className="text-xs text-slate-500">Rejected Claims</div>
          </div>
        </div>
        <div className="card px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-slate-900">{stats?.approved ?? 0}</div>
            <div className="text-xs text-slate-500">Approved Claims</div>
          </div>
        </div>
        <div className="card px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-slate-900">{resolutionRate}%</div>
            <div className="text-xs text-slate-500">Resolution Rate</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
