import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line, PieChart, Pie
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Users, TrendingDown, DollarSign, Briefcase } from "lucide-react";

const headcountByDept = [
  { dept: "Engineering", hc: 34, color: "#2563EB" },
  { dept: "Sales", hc: 18, color: "#22C55E" },
  { dept: "Marketing", hc: 10, color: "#7C3AED" },
  { dept: "G&A", hc: 12, color: "#D97706" },
  { dept: "Product", hc: 11, color: "#0891B2" },
  { dept: "Support", hc: 4, color: "#64748B" },
];

const hiringPlan = [
  { month: "Jan", actual: 3, plan: 4 },
  { month: "Feb", actual: 4, plan: 4 },
  { month: "Mar", actual: 5, plan: 5 },
  { month: "Apr", actual: 3, plan: 4 },
  { month: "May", actual: 6, plan: 5 },
  { month: "Jun", actual: 5, plan: 6 },
  { month: "Jul", actual: 4, plan: 5 },
  { month: "Aug", actual: 7, plan: 6 },
  { month: "Sep", actual: 4, plan: 5 },
  { month: "Oct", actual: 5, plan: 5 },
  { month: "Nov", actual: 6, plan: 6 },
  { month: "Dec", actual: 7, plan: 6 },
];

const attrition = [
  { dept: "Engineering", rate: 8.2 },
  { dept: "Sales", rate: 14.6 },
  { dept: "Marketing", rate: 10.1 },
  { dept: "G&A", rate: 6.4 },
  { dept: "Product", rate: 7.8 },
  { dept: "Support", rate: 16.2 },
];

const openRoles = [
  { role: "Senior Software Engineer", dept: "Engineering", level: "IC5", comp: "$180K–$220K", status: "Interviewing", days: 28 },
  { role: "Sales Director", dept: "Sales", level: "Manager", comp: "$140K–$170K + OTE", status: "Offer Out", days: 45 },
  { role: "Data Analyst", dept: "Analytics", level: "IC3", comp: "$110K–$130K", status: "Screening", days: 14 },
  { role: "Product Manager", dept: "Product", level: "IC4", comp: "$150K–$180K", status: "Interviewing", days: 32 },
  { role: "Marketing Manager", dept: "Marketing", level: "IC4", comp: "$120K–$145K", status: "Screening", days: 19 },
  { role: "Customer Success Manager", dept: "Support", level: "IC3", comp: "$90K–$110K", status: "Offer Accepted", days: 52 },
  { role: "VP of Engineering", dept: "Engineering", level: "VP", comp: "$240K–$290K", status: "Searching", days: 64 },
];

const statusColor: Record<string, string> = {
  "Searching": "bg-slate-100 text-slate-600",
  "Screening": "bg-blue-50 text-primary",
  "Interviewing": "bg-amber-50 text-amber-700",
  "Offer Out": "bg-orange-50 text-orange-700",
  "Offer Accepted": "bg-green-50 text-success",
};

export default function People() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">People</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Headcount, hiring plan, attrition, compensation & open roles</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Headcount" value="89" change={21.9} changeLabel="YoY" icon={<Users className="w-4 h-4" />} iconBg="bg-blue-50 text-primary" />
        <KpiCard title="YTD Attrition" value="9.8%" change={-2.1} changeLabel="vs last year" isPositiveGood={false} icon={<TrendingDown className="w-4 h-4" />} iconBg="bg-green-50 text-success" />
        <KpiCard title="Avg Total Comp" value="$148K" change={6.4} changeLabel="YoY" icon={<DollarSign className="w-4 h-4" />} iconBg="bg-amber-50 text-amber-600" />
        <KpiCard title="Open Roles" value="7" subtitle="Target: fill by Q1 2025" icon={<Briefcase className="w-4 h-4" />} iconBg="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChartCard title="Headcount by Department" subtitle="Current distribution — 89 employees">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={headcountByDept} cx="50%" cy="50%" outerRadius={80} dataKey="hc" nameKey="dept">
                {headcountByDept.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} employees`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
            {headcountByDept.map((d) => (
              <div key={d.dept} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                {d.dept} ({d.hc})
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Monthly Hiring: Plan vs Actual" subtitle="New hires per month — FY 2024" className="col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hiringPlan} barGap={3} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="plan" name="Hiring Plan" fill="#E2E8F0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual" name="Actual Hires" radius={[3, 3, 0, 0]}>
                {hiringPlan.map((d, i) => <Cell key={i} fill={d.actual >= d.plan ? "#22C55E" : "#2563EB"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-slate-200" />Plan</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-success" />At/Above Plan</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-primary" />Below Plan</div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <ChartCard title="Attrition by Department" subtitle="Voluntary turnover rate" className="col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attrition} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 20]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="dept" width={80} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Attrition"]} />
              <Bar dataKey="rate" radius={[0, 3, 3, 0]}>
                {attrition.map((d, i) => <Cell key={i} fill={d.rate >= 14 ? "#EF4444" : d.rate >= 10 ? "#D97706" : "#22C55E"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="col-span-3 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Open Roles</h3>
              <p className="text-xs text-muted-foreground mt-0.5">7 positions — updated Dec 28, 2024</p>
            </div>
            <button className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90">
              + Add Role
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-muted-foreground text-xs">
                  <th className="text-left px-5 py-3 font-medium">Role</th>
                  <th className="text-left px-3 py-3 font-medium">Dept</th>
                  <th className="text-left px-3 py-3 font-medium">Comp Range</th>
                  <th className="text-left px-3 py-3 font-medium">Status</th>
                  <th className="text-right px-3 py-3 font-medium">Days Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {openRoles.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800 text-xs">{r.role}</div>
                      <div className="text-xs text-muted-foreground">{r.level}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-primary">{r.dept}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{r.comp}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                    </td>
                    <td className={`px-3 py-3 text-right text-xs font-bold ${r.days >= 45 ? "text-destructive" : r.days >= 30 ? "text-amber-600" : "text-success"}`}>{r.days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
