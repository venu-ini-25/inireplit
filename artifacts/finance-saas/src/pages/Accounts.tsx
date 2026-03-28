import { Plus, CreditCard, Building2, TrendingUp, ShieldCheck, Bitcoin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useGetAccounts } from "@workspace/api-client-react";

export default function Accounts() {
  const { data: accounts, isLoading } = useGetAccounts();

  const getIconForType = (type: string) => {
    switch(type) {
      case 'checking': return <Building2 className="w-6 h-6" />;
      case 'credit': return <CreditCard className="w-6 h-6" />;
      case 'investment': return <TrendingUp className="w-6 h-6" />;
      case 'savings': return <ShieldCheck className="w-6 h-6" />;
      case 'crypto': return <Bitcoin className="w-6 h-6" />;
      default: return <Building2 className="w-6 h-6" />;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your connected financial accounts.</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 font-medium">
          <Plus className="w-4 h-4" />
          Connect Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading || !accounts ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 border-border/50 animate-pulse">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="w-16 h-6 rounded-full bg-muted" />
              </div>
              <div className="w-32 h-5 bg-muted rounded mb-2" />
              <div className="w-24 h-4 bg-muted/50 rounded mb-6" />
              <div className="w-40 h-8 bg-muted rounded" />
            </div>
          ))
        ) : (
          accounts.map((account) => (
            <div 
              key={account.id} 
              className="glass-card rounded-2xl p-6 border-border/50 group hover:border-primary/30 hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle gradient glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-foreground border border-border group-hover:border-primary/20 transition-colors">
                    {getIconForType(account.type)}
                  </div>
                  <StatusBadge status={account.status} />
                </div>
                
                <div className="mb-6">
                  <h3 className="font-semibold text-lg text-foreground">{account.name}</h3>
                  <p className="text-sm text-muted-foreground">{account.institution}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Balance</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
                
                {account.accountNumber && (
                  <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center text-sm text-muted-foreground">
                    <span>Account Number</span>
                    <span className="font-mono">•••• {account.accountNumber.slice(-4)}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
