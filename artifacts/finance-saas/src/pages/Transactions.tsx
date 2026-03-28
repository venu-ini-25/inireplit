import { useState } from "react";
import { Search, Filter, Download, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useGetTransactions } from "@workspace/api-client-react";
import type { GetTransactionsType, GetTransactionsStatus } from "@workspace/api-client-react";

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<GetTransactionsType | undefined>();
  const [statusFilter, setStatusFilter] = useState<GetTransactionsStatus | undefined>();
  
  const { data, isLoading } = useGetTransactions({ 
    page, 
    limit: 20,
    type: typeFilter,
    status: statusFilter
  });

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">Manage and view all your financial activity.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5">
            <Plus className="w-4 h-4" />
            Add Record
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between border-border/50">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="px-4 py-2.5 rounded-xl bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none"
            value={typeFilter || ""}
            onChange={(e) => setTypeFilter(e.target.value ? e.target.value as GetTransactionsType : undefined)}
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>

          <select 
            className="px-4 py-2.5 rounded-xl bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none"
            value={statusFilter || ""}
            onChange={(e) => setStatusFilter(e.target.value ? e.target.value as GetTransactionsStatus : undefined)}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          
          <button className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-2xl border-border/50 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 shadow-sm shadow-black/20">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading || !data ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-muted rounded animate-pulse" /></td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-40 bg-muted rounded animate-pulse mb-1" />
                      <div className="h-3 w-24 bg-muted/50 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-muted rounded-full animate-pulse" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-5 w-20 bg-muted rounded ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-4">
                      <Search className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No transactions found</h3>
                    <p className="text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                data.transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
                      {formatDate(txn.date)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{txn.description}</p>
                      {txn.merchant && (
                        <p className="text-xs text-muted-foreground mt-0.5">{txn.merchant}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{txn.account}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{txn.category}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={txn.status} />
                    </td>
                    <td className={`px-6 py-4 text-right font-medium whitespace-nowrap ${
                      txn.type === 'income' ? 'text-success' : 'text-foreground'
                    }`}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/50">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">1</span> to <span className="font-medium text-foreground">{data?.transactions.length || 0}</span> of <span className="font-medium text-foreground">{data?.total || 0}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={!data || data.transactions.length < data.limit}
              className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
