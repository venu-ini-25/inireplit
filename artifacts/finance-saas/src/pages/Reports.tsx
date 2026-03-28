import { FileText, Download, Share2, MoreVertical, Search } from "lucide-react";
import { useGetReports } from "@workspace/api-client-react";

export default function Reports() {
  const { data: reports, isLoading } = useGetReports();

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Generated financial and operational reports.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          Generate New Report
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search reports..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm outline-none transition-all focus:border-primary"
            />
          </div>
          <div className="flex gap-2 text-sm text-slate-600 font-medium">
            <button className="px-3 py-1.5 hover:bg-slate-100 rounded-md">All Reports</button>
            <button className="px-3 py-1.5 hover:bg-slate-100 rounded-md">Financial</button>
            <button className="px-3 py-1.5 hover:bg-slate-100 rounded-md">Operational</button>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-slate-50">
              <th className="px-6 py-4">Report Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date Generated</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-5 w-48 bg-slate-100 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-5 w-8 bg-slate-100 rounded ml-auto animate-pulse"></div></td>
                </tr>
              ))
            ) : reports?.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{report.title}</p>
                      <p className="text-xs text-muted-foreground">{report.companyId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                    {report.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    report.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(report.generatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2 text-muted-foreground">
                    <button className="p-1.5 hover:text-primary hover:bg-blue-50 rounded transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:text-primary hover:bg-blue-50 rounded transition-colors" title="Share">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors" title="More">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
