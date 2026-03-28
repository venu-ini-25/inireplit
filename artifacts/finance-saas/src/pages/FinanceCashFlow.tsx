export default function FinanceCashFlow() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Flow</h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed cash flow analysis and projections</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M6 12h.01M18 12h.01"></path>
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Cash Flow Dashboard</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Connect your accounting software to view real-time cash flow, burn rate, and runway metrics.
        </p>
        <button className="px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors shadow-sm">
          Connect Data Source
        </button>
      </div>
    </div>
  );
}
