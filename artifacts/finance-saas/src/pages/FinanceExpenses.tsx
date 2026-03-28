export default function FinanceExpenses() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Expense breakdown by category and department</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Expense Analytics</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Categorized expense tracking is being initialized. Sync your corporate cards to see full details.
        </p>
        <button className="px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors shadow-sm">
          Link Corporate Cards
        </button>
      </div>
    </div>
  );
}
