import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { Download, Filter, Search } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { FilterBar } from "@/components/ui/FilterBar";
import { useState } from "react";

const categories = [
  { name: "Payroll & Benefits", value: 18400, color: "#2563EB" },
  { name: "Software & SaaS", value: 5200, color: "#7C3AED" },
  { name: "Marketing & Ads", value: 4100, color: "#0891B2" },
  { name: "Office & Facilities", value: 2800, color: "#D97706" },
  { name: "Travel & Entertainment", value: 1600, color: "#DC2626" },
  { name: "Professional Services", value: 2100, color: "#059669" },
  { name: "Other", value: 1800, color: "#64748B" },
];

const deptData = [
  { dept: "Engineering", budget: 12000, actual: 11200 },
  { dept: "Sales", budget: 8000, actual: 8900 },
  { dept: "Marketing", budget: 6000, actual: 5800 },
  { dept: "G&A", budget: 4500, actual: 4100 },
  { dept: "Product", budget: 5500, actual: 5200 },
  { dept: "Support", budget: 2000, actual: 1800 },
];

const lineItems = [
  { vendor: "Workday", category: "Software & SaaS", dept: "HR", amount: 1200, status: "Recurring", date: "Dec 1, 2024" },
  { vendor: "AWS", category: "Software & SaaS", dept: "Engineering", amount: 3800, status: "Recurring", date: "Dec 1, 2024" },
  { vendor: "Salesforce", category: "Software & SaaS", dept: "Sales", amount: 2100, status: "Recurring", date: "Dec 1, 2024" },
  { vendor: "Lattice", category: "Software & SaaS", dept: "HR", amount: 900, status: "Recurring", date: "Dec 1, 2024" },
  { vendor: "Google Ads", category: "Marketing & Ads", dept: "Marketing", amount: 4100, status: "Variable", date: "Nov 30, 2024" },
  { vendor: "JW Marriott", category: "Travel & Entertainment", dept: "Sales", amount: 1600, status: "One-time", date: "Nov 28, 2024" },
  { vendor: "WeWork", category: "Office & Facilities", dept: "G&A", amount: 2800, status: "Recurring", date: "Dec 1, 2024" },
  { vendor: "Deloitte", category: "Professional Services", dept: "Finance", amount: 2100, status: "One-time", date: "Nov 25, 2024" },
];

const DEPTS = ["All Depts", "Engineering", "Sales", "Marketing", "G&A", "Product"];
const total = categories.reduce((s, c) => s + c.value, 0);

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
  if (percent < 0.07) return null;
  const r = outerRadius + 20;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} fill="#64748b" fontSize={10}>{`${(percent * 100).toFixed(0)}%`}</text>;
};

export default function FinanceExpenses() {
  const [dept, setDept] = useState("All Depts");
  const [search, setSearch] = useState("");

  const filtered = lineItems.filter(
    (r) =>
      (dept === "All Depts" || r.dept === dept) &&
      (search === "" || r.vendor.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Category & department spend analysis — Dec 2024</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-slate-50">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Expenses" value="$36.0M" change={9.2} changeLabel="YoY" isPositiveGood={false} />
        <KpiCard title="Largest Category" value="Payroll" subtitle="51% of total expenses" />
        <KpiCard title="Over-budget Depts" value="1 dept" subtitle="Sales: +11% over budget" isPositiveGood={false} />
        <KpiCard title="YTD vs Budget" value="97.4%" change={-2.6} changeLabel="vs target" />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <ChartCard title="Expense by Category" subtitle="Full year breakdown" className="col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categories} cx="50%" cy="50%" outerRadius={90} dataKey="value" labelLine={false} label={renderLabel}>
                {categories.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {categories.map((c) => (
              <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Budget vs Actual by Dept" subtitle="$000s — current period" className="col-span-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptData} barGap={4} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dept" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="budget" name="Budget" fill="#E2E8F0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]}>
                {deptData.map((d, i) => <Cell key={i} fill={d.actual > d.budget ? "#EF4444" : "#2563EB"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800">Expense Line Items</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor..."
                className="pl-8 pr-3 py-1.5 border border-border rounded-md text-sm outline-none focus:border-primary w-48"
              />
            </div>
            <FilterBar options={DEPTS} active={dept} onChange={setDept} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-muted-foreground text-xs">
                <th className="text-left px-6 py-3 font-medium">Vendor</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Department</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{row.vendor}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.category}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-primary">{row.dept}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-800">${row.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.status === "Recurring" ? "bg-green-50 text-success" :
                      row.status === "Variable" ? "bg-amber-50 text-amber-700" :
                      "bg-slate-100 text-muted-foreground"
                    }`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
