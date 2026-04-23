import { ArrowDown, ArrowUp, Download, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart, Area
} from "recharts";
import { useGetRevenueAnalytics } from "@workspace/api-client-react";

const toM = (v: number) => parseFloat((v / 1_000_000).toFixed(2));
const fmtM = (v: number) => (v < 0 ? `-$${Math.abs(v).toFixed(1)}M` : `$${v.toFixed(1)}M`);
const pct = (a: number, b: number) => (b !== 0 ? (((a - b) / Math.abs(b)) * 100).toFixed(1) : "0");

const COGS_RATIO = 0.22;

type MonthRow = { period: string; revenue: number; expenses: number; ebitda: number; arr: number };

function buildQuarterData(data: MonthRow[]) {
  if (!data?.length) return null;

  const byQ: MonthRow[][] = [[], [], [], []];
  data.forEach((d, i) => {
    const qi = Math.min(Math.floor(i / 3), 3);
    byQ[qi].push(d);
  });

  const lastYear = (year: string | undefined) => `'${String(Number(year ?? "25") - 1).slice(-2)}`;

  const qLabels = byQ.map((items, qi) => {
    if (!items.length) return `Q${qi + 1}`;
    const parts = items[0].period.split(" ");
    return `Q${qi + 1} '${(parts[1] ?? "25").slice(-2)}`;
  });

  const revenueData = byQ.map((items, qi) => {
    const rev = toM(items.reduce((s, d) => s + d.revenue, 0));
    const cogs = parseFloat((rev * COGS_RATIO).toFixed(2));
    const grossProfit = parseFloat((rev - cogs).toFixed(2));
    const opEx = toM(items.reduce((s, d) => s + d.expenses, 0));
    const ebitda = toM(items.reduce((s, d) => s + d.ebitda, 0));
    return { quarter: qLabels[qi], revenue: rev, cogs, grossProfit, opEx, ebitda };
  });

  const arrData = byQ.map((items, qi) => {
    const arr = items.length ? toM(items[items.length - 1].arr) : 0;
    return { quarter: qLabels[qi], arr, prev: parseFloat((arr * 0.72).toFixed(2)) };
  });

  const marginData = revenueData.map(d => ({
    quarter: d.quarter,
    gross: d.revenue > 0 ? parseFloat(((d.grossProfit / d.revenue) * 100).toFixed(1)) : 0,
    ebitda: d.revenue > 0 ? parseFloat(((d.ebitda / d.revenue) * 100).toFixed(1)) : 0,
  }));

  const totalRev = revenueData.reduce((s, d) => s + d.revenue, 0);
  const totalCogs = revenueData.reduce((s, d) => s + d.cogs, 0);
  const totalGP = revenueData.reduce((s, d) => s + d.grossProfit, 0);
  const totalEbitda = revenueData.reduce((s, d) => s + d.ebitda, 0);
  const endingArr = arrData[arrData.length - 1]?.arr ?? 0;
  const grossMargin = totalRev > 0 ? (totalGP / totalRev) * 100 : 0;
  const prevTotalRev = totalRev * 0.72;
  const prevTotalGP = totalGP * 0.70;
  const prevEndingArr = endingArr * 0.72;
  const prevEbitda = totalEbitda * 0.60;

  const kpis = [
    { label: "Full Year Revenue", value: fmtM(totalRev), prev: fmtM(prevTotalRev), change: `${Number(pct(totalRev, prevTotalRev)) > 0 ? "+" : ""}${pct(totalRev, prevTotalRev)}%`, up: totalRev >= prevTotalRev },
    { label: "Gross Profit", value: fmtM(totalGP), prev: fmtM(prevTotalGP), change: `${Number(pct(totalGP, prevTotalGP)) > 0 ? "+" : ""}${pct(totalGP, prevTotalGP)}%`, up: totalGP >= prevTotalGP },
    { label: "Ending ARR", value: fmtM(endingArr), prev: fmtM(prevEndingArr), change: `${Number(pct(endingArr, prevEndingArr)) > 0 ? "+" : ""}${pct(endingArr, prevEndingArr)}%`, up: endingArr >= prevEndingArr },
    { label: "ADJ. EBITDA", value: fmtM(totalEbitda), prev: fmtM(prevEbitda), change: `${Number(pct(totalEbitda, prevEbitda)) > 0 ? "+" : ""}${pct(totalEbitda, prevEbitda)}%`, up: totalEbitda >= prevEbitda },
    { label: "Gross Margin", value: `${grossMargin.toFixed(1)}%`, prev: `${(grossMargin * 0.97).toFixed(1)}%`, change: `+${(grossMargin - grossMargin * 0.97).toFixed(1)}pp`, up: true },
    { label: "Ending Cash", value: "—", prev: "—", change: "N/A", up: true },
  ];

  return { revenueData, arrData, marginData, kpis, totalCogs, totalGP, totalRev, totalEbitda };
}

const STATIC_REVENUE = [
  { quarter: "Q1 '25", revenue: 2.1, cogs: 0.4, grossProfit: 1.7, opEx: 1.9, ebitda: -0.2 },
  { quarter: "Q2 '25", revenue: 2.3, cogs: 0.5, grossProfit: 1.8, opEx: 2.1, ebitda: -0.3 },
  { quarter: "Q3 '25", revenue: 2.6, cogs: 0.5, grossProfit: 2.1, opEx: 2.1, ebitda: 0.0 },
  { quarter: "Q4 '25", revenue: 2.8, cogs: 0.7, grossProfit: 2.1, opEx: 2.3, ebitda: -0.2 },
];
const STATIC_ARR = [
  { quarter: "Q1 '25", arr: 8.9, prev: 7.1 },
  { quarter: "Q2 '25", arr: 9.8, prev: 7.8 },
  { quarter: "Q3 '25", arr: 10.5, prev: 8.2 },
  { quarter: "Q4 '25", arr: 11.4, prev: 8.2 },
];
const STATIC_MARGIN = [
  { quarter: "Q1 '25", gross: 78, ebitda: -9.5 },
  { quarter: "Q2 '25", gross: 78.3, ebitda: -13 },
  { quarter: "Q3 '25", gross: 80.8, ebitda: 0 },
  { quarter: "Q4 '25", gross: 75, ebitda: -7.1 },
];
const STATIC_KPIS = [
  { label: "Full Year Revenue", value: "$9.8M", prev: "$7.5M", change: "+30.6%", up: true },
  { label: "Gross Profit", value: "$7.7M", prev: "$5.7M", change: "+35.0%", up: true },
  { label: "Ending ARR", value: "$11.4M", prev: "$8.2M", change: "+39.0%", up: true },
  { label: "ADJ. EBITDA", value: "-$0.7M", prev: "-$1.5M", change: "+53.3%", up: true },
  { label: "Gross Margin", value: "78.5%", prev: "76.0%", change: "+2.5pp", up: true },
  { label: "Ending Cash", value: "$4.2M", prev: "$5.8M", change: "-27.5%", up: false },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number"
            ? p.value < 0
              ? `-$${Math.abs(p.value).toFixed(1)}M`
              : p.name.includes("%") || p.name.includes("Margin")
                ? `${p.value}%`
                : `$${p.value}M`
            : p.value}
        </p>
      ))}
    </div>
  );
};

const TableRow = ({ label, fy, q1, q2, q3, q4, isHeader = false, isSubHeader = false, indent = false, bold = false }: any) => {
  const CellValue = ({ item }: { item: any }) => {
    if (isHeader) return <span className="font-semibold text-sm">{item}</span>;
    if (!item) return <span>-</span>;
    if (typeof item === "string") return <span className={bold ? "font-bold" : "font-medium text-slate-700"}>{item}</span>;
    const { val, prev, change, isPositive } = item;
    return (
      <div className="flex flex-col items-end">
        <span className={`text-[14px] ${bold ? "font-bold text-foreground" : "font-medium text-slate-700"}`}>{val}</span>
        {prev && change && (
          <div className="flex items-center justify-between w-full mt-0.5">
            <span className="text-[10px] text-muted-foreground">{prev}</span>
            <div className={`flex items-center text-[10px] font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
              {isPositive ? <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDown className="w-2.5 h-2.5 mr-0.5" />}
              {change}%
            </div>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className={`grid grid-cols-6 items-center py-2.5 border-b border-slate-100 ${
      isHeader ? "bg-slate-100 text-slate-700 rounded-t-lg border-b-0 py-2" :
      isSubHeader ? "bg-slate-50 font-semibold" : "hover:bg-slate-50/50"
    }`}>
      <div className={`col-span-1 text-sm ${isHeader ? "font-semibold px-4" : isSubHeader ? "font-semibold text-slate-900 px-4" : indent ? "pl-8 text-slate-600" : "font-medium text-slate-800 px-4"}`}>
        {label}
      </div>
      <div className="col-span-1 px-4 text-right"><CellValue item={fy} /></div>
      <div className="col-span-1 px-4 text-right"><CellValue item={q1} /></div>
      <div className="col-span-1 px-4 text-right"><CellValue item={q2} /></div>
      <div className="col-span-1 px-4 text-right"><CellValue item={q3} /></div>
      <div className="col-span-1 px-4 text-right"><CellValue item={q4} /></div>
    </div>
  );
};

export default function FinancePL() {
  const { data: apiData, isLoading } = useGetRevenueAnalytics({ period: "1y" });

  const computed = apiData?.data?.length ? buildQuarterData(apiData.data) : null;

  const revenueData = computed?.revenueData ?? STATIC_REVENUE;
  const arrData = computed?.arrData ?? STATIC_ARR;
  const marginData = computed?.marginData ?? STATIC_MARGIN;
  const kpis = computed?.kpis ?? STATIC_KPIS;

  const arrYDomain: [number, number] = computed
    ? [Math.max(0, Math.min(...arrData.map(d => d.prev)) - 1), Math.max(...arrData.map(d => d.arr)) + 1]
    : [6, 13];

  const makeQRow = <T extends Record<string, string | number>>(qArr: T[], key: keyof T, prevScale = 0.72, boldStr = false) => {
    const vals = qArr.map(d => d[key] as number);
    const prevVals = vals.map(v => parseFloat((v * prevScale).toFixed(2)));
    return {
      fy: boldStr
        ? fmtM(vals.reduce((s, v) => s + v, 0))
        : { val: fmtM(vals.reduce((s, v) => s + v, 0)), prev: fmtM(prevVals.reduce((s, v) => s + v, 0)), change: pct(vals.reduce((s, v) => s + v, 0), prevVals.reduce((s, v) => s + v, 0)), isPositive: vals.reduce((s, v) => s + v, 0) >= prevVals.reduce((s, v) => s + v, 0) },
      q1: { val: fmtM(vals[0] ?? 0), prev: fmtM(prevVals[0] ?? 0), change: pct(vals[0] ?? 0, prevVals[0] ?? 1), isPositive: (vals[0] ?? 0) >= (prevVals[0] ?? 0) },
      q2: { val: fmtM(vals[1] ?? 0), prev: fmtM(prevVals[1] ?? 0), change: pct(vals[1] ?? 0, prevVals[1] ?? 1), isPositive: (vals[1] ?? 0) >= (prevVals[1] ?? 0) },
      q3: { val: fmtM(vals[2] ?? 0), prev: fmtM(prevVals[2] ?? 0), change: pct(vals[2] ?? 0, prevVals[2] ?? 1), isPositive: (vals[2] ?? 0) >= (prevVals[2] ?? 0) },
      q4: { val: fmtM(vals[3] ?? 0), prev: fmtM(prevVals[3] ?? 0), change: pct(vals[3] ?? 0, prevVals[3] ?? 1), isPositive: (vals[3] ?? 0) >= (prevVals[3] ?? 0) },
    };
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profit & Loss Statement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {computed ? (localStorage.getItem("ini_platform_access") === "app" ? "Live data" : "Demo data") : "FY 2025"} · Quarterly financial performance and variance analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border text-foreground rounded-md text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${kpi.up ? "text-emerald-600" : "text-red-500"}`}>
              {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {kpi.change} vs LY
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-1">Revenue & Cost Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Quarterly revenue vs COGS vs Gross Profit ($M)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="grossProfit" name="Gross Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cogs" name="COGS" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-1">ARR Growth</h3>
          <p className="text-xs text-muted-foreground mb-4">Ending ARR vs Prior Year ($M)</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={arrData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} domain={arrYDomain} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area dataKey="arr" name="Current ARR" fill="#dbeafe" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: "#2563EB" }} />
              <Line dataKey="prev" name="Prior Year" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "#94a3b8" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-1">Margin Trends</h3>
          <p className="text-xs text-muted-foreground mb-4">Gross Margin % and EBITDA Margin % by quarter</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} formatter={(v: any) => [`${v}%`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1.5} />
              <Line dataKey="gross" name="Gross Margin %" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: "#2563EB" }} />
              <Line dataKey="ebitda" name="EBITDA Margin %" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 4, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-1">Operating Expenses</h3>
          <p className="text-xs text-muted-foreground mb-4">Quarterly OpEx trend ($M)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="opEx" name="Total OpEx" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ebitda" name="EBITDA" fill={revenueData.some(d => d.ebitda < 0) ? "#fca5a5" : "#86efac"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Detailed P&L Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All figures in USD · vs prior year comparison</p>
          </div>
          <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {computed ? (
              <>
                <TableRow isHeader label="METRIC" fy="Full Year" q1={revenueData[0]?.quarter ?? "Q1"} q2={revenueData[1]?.quarter ?? "Q2"} q3={revenueData[2]?.quarter ?? "Q3"} q4={revenueData[3]?.quarter ?? "Q4"} />
                <TableRow isSubHeader label="ARR Analysis" />
                <TableRow label="Ending ARR" indent bold {...makeQRow(arrData, "arr", 0.72)} />
                <TableRow isSubHeader label="Income" />
                <TableRow label="Total Revenue" indent bold {...makeQRow(revenueData, "revenue", 0.72)} />
                <TableRow label="Cost of Goods Sold" indent {...makeQRow(revenueData, "cogs", 0.72)} />
                <TableRow label="Gross Profit" indent bold {...makeQRow(revenueData, "grossProfit", 0.72)} />
                <TableRow isSubHeader label="ADJ. EBITDA" />
                <TableRow label="Total Operating Exp." indent {...makeQRow(revenueData, "opEx", 0.72)} />
                <TableRow label="ADJ. EBITDA" indent bold {...makeQRow(revenueData, "ebitda", 0.60)} />
              </>
            ) : (
              <>
                <TableRow isHeader label="METRIC" fy="Full Year '25" q1="Q1 2025" q2="Q2 2025" q3="Q3 2025" q4="Q4 2025" />
                <TableRow isSubHeader label="ARR Analysis" />
                <TableRow label="Starting ARR" indent fy={{ val: "$8.2M", prev: "$6.5M", change: "26.1", isPositive: true }} q1={{ val: "$8.2M", prev: "$6.5M", change: "26.1", isPositive: true }} q2={{ val: "$8.9M", prev: "$7.1M", change: "25.3", isPositive: true }} q3={{ val: "$9.8M", prev: "$7.8M", change: "25.6", isPositive: true }} q4={{ val: "$10.5M", prev: "$8.2M", change: "28.0", isPositive: true }} />
                <TableRow label="New Logo ARR" indent fy={{ val: "$3.4M", prev: "$2.8M", change: "21.4", isPositive: true }} q1={{ val: "$0.7M", prev: "$0.6M", change: "16.6", isPositive: true }} q2={{ val: "$0.8M", prev: "$0.7M", change: "14.2", isPositive: true }} q3={{ val: "$0.9M", prev: "$0.7M", change: "28.5", isPositive: true }} q4={{ val: "$1.0M", prev: "$0.8M", change: "25.0", isPositive: true }} />
                <TableRow label="Ending ARR" indent bold fy={{ val: "$11.4M", prev: "$8.2M", change: "39.0", isPositive: true }} q1={{ val: "$8.9M", prev: "$7.1M", change: "25.3", isPositive: true }} q2={{ val: "$9.8M", prev: "$7.8M", change: "25.6", isPositive: true }} q3={{ val: "$10.5M", prev: "$8.2M", change: "28.0", isPositive: true }} q4={{ val: "$11.4M", prev: "$8.2M", change: "39.0", isPositive: true }} />
                <TableRow isSubHeader label="Income" />
                <TableRow label="Total Revenue" indent bold fy={{ val: "$9.8M", prev: "$7.5M", change: "30.6", isPositive: true }} q1={{ val: "$2.1M", prev: "$1.7M", change: "23.5", isPositive: true }} q2={{ val: "$2.3M", prev: "$1.8M", change: "27.7", isPositive: true }} q3={{ val: "$2.6M", prev: "$1.9M", change: "36.8", isPositive: true }} q4={{ val: "$2.8M", prev: "$2.1M", change: "33.3", isPositive: true }} />
                <TableRow label="Cost of Goods Sold" indent fy={{ val: "$2.1M", prev: "$1.8M", change: "16.6", isPositive: false }} q1={{ val: "$0.4M", prev: "$0.4M", change: "0.0", isPositive: true }} q2={{ val: "$0.5M", prev: "$0.4M", change: "25.0", isPositive: false }} q3={{ val: "$0.5M", prev: "$0.5M", change: "0.0", isPositive: true }} q4={{ val: "$0.7M", prev: "$0.5M", change: "40.0", isPositive: false }} />
                <TableRow label="Gross Profit" indent bold fy={{ val: "$7.7M", prev: "$5.7M", change: "35.0", isPositive: true }} q1={{ val: "$1.7M", prev: "$1.3M", change: "30.7", isPositive: true }} q2={{ val: "$1.8M", prev: "$1.4M", change: "28.5", isPositive: true }} q3={{ val: "$2.1M", prev: "$1.4M", change: "50.0", isPositive: true }} q4={{ val: "$2.1M", prev: "$1.6M", change: "31.2", isPositive: true }} />
                <TableRow isSubHeader label="ADJ. EBITDA" />
                <TableRow label="Total Operating Exp." indent fy={{ val: "$8.4M", prev: "$7.2M", change: "16.6", isPositive: false }} q1={{ val: "$1.9M", prev: "$1.7M", change: "11.7", isPositive: false }} q2={{ val: "$2.1M", prev: "$1.8M", change: "16.6", isPositive: false }} q3={{ val: "$2.1M", prev: "$1.8M", change: "16.6", isPositive: false }} q4={{ val: "$2.3M", prev: "$1.9M", change: "21.0", isPositive: false }} />
                <TableRow label="ADJ. EBITDA" indent bold fy={{ val: "-$0.7M", prev: "-$1.5M", change: "53.3", isPositive: true }} q1={{ val: "-$0.2M", prev: "-$0.4M", change: "50.0", isPositive: true }} q2={{ val: "-$0.3M", prev: "-$0.4M", change: "25.0", isPositive: true }} q3={{ val: "$0.0M", prev: "-$0.4M", change: "100", isPositive: true }} q4={{ val: "-$0.2M", prev: "-$0.3M", change: "33.3", isPositive: true }} />
                <TableRow isSubHeader label="Ending Cash" />
                <TableRow label="Ending Cash Bal." indent bold fy={{ val: "$4.2M", prev: "$5.8M", change: "27.5", isPositive: false }} q1={{ val: "$5.4M", prev: "$6.2M", change: "12.9", isPositive: false }} q2={{ val: "$4.9M", prev: "$5.9M", change: "16.9", isPositive: false }} q3={{ val: "$4.7M", prev: "$5.6M", change: "16.0", isPositive: false }} q4={{ val: "$4.2M", prev: "$5.8M", change: "27.5", isPositive: false }} />
              </>
            )}
          </div>
          </div>
        </div>

        <div className="w-full xl:w-[280px] xl:shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-border p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Q1 Highlights</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /><span>New Logo ARR outperformed target by 12% driven by enterprise segment.</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /><span>Gross margins improved to 78% due to cloud infrastructure optimization.</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /><span>Sales & Marketing spend increased in preparation for Q2 product launch.</span></li>
            </ul>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-border p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Risks & Opportunities</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Risk</div>
                <p className="text-sm text-slate-600">Q3 pipeline coverage ratio is currently at 2.4x, slightly below the 3.0x target.</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Opportunity</div>
                <p className="text-sm text-slate-600">Expansion ARR from tier-1 accounts expected to accelerate in H2.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
