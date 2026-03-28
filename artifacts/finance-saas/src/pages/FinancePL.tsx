import { ArrowDown, ArrowUp, Download, MoreHorizontal } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function FinancePL() {
  
  const TableRow = ({ 
    label, 
    fy, 
    q1, 
    q2, 
    q3, 
    q4, 
    isHeader = false, 
    isSubHeader = false,
    indent = false,
    bold = false
  }: any) => {
    
    // Helper to format values and add change indicators
    const CellValue = ({ item }: { item: any }) => {
      if (isHeader) return <span className="font-semibold text-sm">{item}</span>;
      if (!item) return <span>-</span>;
      
      const { val, prev, change, isPositive } = item;
      return (
        <div className="flex flex-col items-end">
          <span className={`text-[15px] ${bold ? 'font-bold text-foreground' : 'font-medium text-slate-700'}`}>
            {val}
          </span>
          {prev && change && (
            <div className="flex items-center justify-between w-full mt-1">
              <span className="text-[10px] text-muted-foreground">{prev}</span>
              <div className={`flex items-center text-[10px] font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDown className="w-2.5 h-2.5 mr-0.5" />}
                {change}%
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className={`grid grid-cols-6 items-center py-3 border-b border-slate-100 ${
        isHeader ? 'bg-[#f1f5f9] text-slate-700 rounded-t-lg border-b-0 py-2' : 
        isSubHeader ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/50'
      }`}>
        <div className={`col-span-1 text-sm ${
          isHeader ? 'font-semibold px-4' : 
          isSubHeader ? 'font-semibold text-slate-900 px-4' : 
          indent ? 'pl-8 text-slate-600' : 'font-medium text-slate-800 px-4'
        }`}>
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

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profit & Loss Statement</h1>
          <p className="text-sm text-muted-foreground mt-1">Quarterly financial performance and variance analysis</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border text-foreground rounded-md text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="min-w-[800px]">
            {/* Table Header */}
            <TableRow 
              isHeader={true}
              label="METRIC"
              fy="Full Year '25"
              q1="Q1'2025"
              q2="Q2'2025"
              q3="Q3'2025"
              q4="Q4'2025"
            />
            
            {/* ARR Analysis */}
            <TableRow isSubHeader={true} label="ARR Analysis" />
            <TableRow 
              label="Starting ARR" indent={true}
              fy={{ val: "$8.2M", prev: "$6.5M", change: "26.1", isPositive: true }}
              q1={{ val: "$8.2M", prev: "$6.5M", change: "26.1", isPositive: true }}
              q2={{ val: "$8.9M", prev: "$7.1M", change: "25.3", isPositive: true }}
              q3={{ val: "$9.8M", prev: "$7.8M", change: "25.6", isPositive: true }}
              q4={{ val: "$10.5M", prev: "$8.2M", change: "28.0", isPositive: true }}
            />
            <TableRow 
              label="New Logo ARR" indent={true}
              fy={{ val: "$3.4M", prev: "$2.8M", change: "21.4", isPositive: true }}
              q1={{ val: "$0.7M", prev: "$0.6M", change: "16.6", isPositive: true }}
              q2={{ val: "$0.8M", prev: "$0.7M", change: "14.2", isPositive: true }}
              q3={{ val: "$0.9M", prev: "$0.7M", change: "28.5", isPositive: true }}
              q4={{ val: "$1.0M", prev: "$0.8M", change: "25.0", isPositive: true }}
            />
            <TableRow 
              label="Ending ARR" indent={true} bold={true}
              fy={{ val: "$11.4M", prev: "$8.2M", change: "39.0", isPositive: true }}
              q1={{ val: "$8.9M", prev: "$7.1M", change: "25.3", isPositive: true }}
              q2={{ val: "$9.8M", prev: "$7.8M", change: "25.6", isPositive: true }}
              q3={{ val: "$10.5M", prev: "$8.2M", change: "28.0", isPositive: true }}
              q4={{ val: "$11.4M", prev: "$8.2M", change: "39.0", isPositive: true }}
            />

            {/* Income */}
            <TableRow isSubHeader={true} label="Income" />
            <TableRow 
              label="Total Revenue" indent={true} bold={true}
              fy={{ val: "$9.8M", prev: "$7.5M", change: "30.6", isPositive: true }}
              q1={{ val: "$2.1M", prev: "$1.7M", change: "23.5", isPositive: true }}
              q2={{ val: "$2.3M", prev: "$1.8M", change: "27.7", isPositive: true }}
              q3={{ val: "$2.6M", prev: "$1.9M", change: "36.8", isPositive: true }}
              q4={{ val: "$2.8M", prev: "$2.1M", change: "33.3", isPositive: true }}
            />
            <TableRow 
              label="Cost of Goods Sold" indent={true}
              fy={{ val: "$2.1M", prev: "$1.8M", change: "16.6", isPositive: false }}
              q1={{ val: "$0.4M", prev: "$0.4M", change: "0.0", isPositive: true }}
              q2={{ val: "$0.5M", prev: "$0.4M", change: "25.0", isPositive: false }}
              q3={{ val: "$0.5M", prev: "$0.5M", change: "0.0", isPositive: true }}
              q4={{ val: "$0.7M", prev: "$0.5M", change: "40.0", isPositive: false }}
            />
            <TableRow 
              label="Gross Profit" indent={true} bold={true}
              fy={{ val: "$7.7M", prev: "$5.7M", change: "35.0", isPositive: true }}
              q1={{ val: "$1.7M", prev: "$1.3M", change: "30.7", isPositive: true }}
              q2={{ val: "$1.8M", prev: "$1.4M", change: "28.5", isPositive: true }}
              q3={{ val: "$2.1M", prev: "$1.4M", change: "50.0", isPositive: true }}
              q4={{ val: "$2.1M", prev: "$1.6M", change: "31.2", isPositive: true }}
            />

            {/* ADJ EBITDA */}
            <TableRow isSubHeader={true} label="ADJ. EBITDA" />
            <TableRow 
              label="Total Operating Exp." indent={true}
              fy={{ val: "$8.4M", prev: "$7.2M", change: "16.6", isPositive: false }}
              q1={{ val: "$1.9M", prev: "$1.7M", change: "11.7", isPositive: false }}
              q2={{ val: "$2.1M", prev: "$1.8M", change: "16.6", isPositive: false }}
              q3={{ val: "$2.1M", prev: "$1.8M", change: "16.6", isPositive: false }}
              q4={{ val: "$2.3M", prev: "$1.9M", change: "21.0", isPositive: false }}
            />
            <TableRow 
              label="ADJ. EBITDA" indent={true} bold={true}
              fy={{ val: "-$0.7M", prev: "-$1.5M", change: "53.3", isPositive: true }}
              q1={{ val: "-$0.2M", prev: "-$0.4M", change: "50.0", isPositive: true }}
              q2={{ val: "-$0.3M", prev: "-$0.4M", change: "25.0", isPositive: true }}
              q3={{ val: "$0.0M", prev: "-$0.4M", change: "100", isPositive: true }}
              q4={{ val: "-$0.2M", prev: "-$0.3M", change: "33.3", isPositive: true }}
            />

            {/* Ending Cash */}
            <TableRow isSubHeader={true} label="Ending Cash" />
            <TableRow 
              label="Ending Cash Bal." indent={true} bold={true}
              fy={{ val: "$4.2M", prev: "$5.8M", change: "27.5", isPositive: false }}
              q1={{ val: "$5.4M", prev: "$6.2M", change: "12.9", isPositive: false }}
              q2={{ val: "$4.9M", prev: "$5.9M", change: "16.9", isPositive: false }}
              q3={{ val: "$4.7M", prev: "$5.6M", change: "16.0", isPositive: false }}
              q4={{ val: "$4.2M", prev: "$5.8M", change: "27.5", isPositive: false }}
            />
          </div>
        </div>

        {/* Sidebar Commentary */}
        <div className="w-[300px] shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Q1 Highlights</h3>
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                <span>New Logo ARR outperformed target by 12% driven by enterprise segment.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                <span>Gross margins improved to 78% due to cloud infrastructure optimization.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                <span>Sales & Marketing spend increased in preparation for Q2 product launch.</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-border p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Risks & Opportunities</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-destructive uppercase tracking-wider mb-1">Risk</div>
                <p className="text-sm text-slate-600">Q3 pipeline coverage ratio is currently at 2.4x, slightly below the 3.0x target.</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-success uppercase tracking-wider mb-1">Opportunity</div>
                <p className="text-sm text-slate-600">Expansion ARR from tier-1 accounts expected to accelerate in H2.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
