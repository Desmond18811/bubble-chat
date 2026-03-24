import BubbleLayout from "@/components/BubbleLayout";
import { TrendingUp, Link2, Cloud, ArrowDownLeft, ShoppingBag, Coffee, AlertTriangle, Plus, Sparkles } from "lucide-react";

const transactions = [
  { icon: Cloud, label: "Nebula Cloud Services", desc: "Automated hosting payment", amount: "-$420.00", time: "2 hours ago", color: "text-foreground" },
  { icon: ArrowDownLeft, label: "Project Dividend", desc: "External wire transfer", amount: "+$5,200.00", time: "Yesterday", color: "text-bubble-green" },
  { icon: ShoppingBag, label: "Design Assets", desc: "STORE PURCHASE", amount: "-$89.50", time: "", color: "text-foreground" },
  { icon: Coffee, label: "Observer Cafe", desc: "", amount: "-$4.20", time: "", color: "text-foreground", small: true },
];

const PaymentsPage = () => {
  return (
    <BubbleLayout>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-auto">
        {/* Left Panel */}
        <div className="w-96 border-r border-border p-6 flex flex-col gap-6">
          {/* Balance */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <p className="text-muted-foreground text-[10px] tracking-widest mb-2">AVAILABLE BALANCE</p>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="font-display font-bold text-foreground text-5xl">$42,890</span>
              <span className="text-muted-foreground text-lg">.65</span>
            </div>
            <div className="flex gap-3">
              <button className="bg-primary text-primary-foreground font-display font-semibold text-sm px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                Deposit
              </button>
              <button className="bg-secondary text-foreground font-display font-semibold text-sm px-6 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors">
                Withdraw
              </button>
            </div>
          </div>

          {/* Wallet Insights */}
          <div>
            <h3 className="font-display font-bold text-foreground text-lg mb-3">Wallet Insights</h3>
            <div className="bg-card rounded-2xl border border-border p-5 mb-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-bubble-green text-xs font-semibold">+12.4%</span>
              </div>
              <p className="text-muted-foreground text-[10px] tracking-widest mb-1">MONTHLY YIELD</p>
              <p className="font-display font-bold text-foreground text-2xl">$1,240.00</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-3">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <span className="text-bubble-green text-[10px] tracking-wider font-semibold">ACTIVE</span>
              </div>
              <p className="text-muted-foreground text-[10px] tracking-widest mb-1">CONNECTED ACCOUNTS</p>
              <div className="flex gap-1 mt-2">
                {["BN", "CH", "AX"].map((code) => (
                  <span key={code} className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-display font-semibold text-foreground">
                    {code}
                  </span>
                ))}
                <span className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] text-muted-foreground">+2</span>
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="bg-card rounded-2xl border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-foreground text-sm">BubbleWise AI</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              "Your subscription spending increased by 8% this month. Consider consolidating your cloud storage to save $45/mo."
            </p>
            <button className="text-primary text-[10px] tracking-wider font-display font-semibold mt-3 hover:opacity-80 flex items-center gap-1">
              OPTIMIZATION VIEW →
            </button>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 p-6 overflow-auto scrollbar-thin">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display font-bold text-foreground text-3xl">Recent Activity</h1>
              <p className="text-muted-foreground text-sm mt-1">Real-time ledger of your luminous transactions</p>
            </div>
            <div className="flex bg-secondary rounded-lg overflow-hidden">
              {["ALL", "INCOME", "EXPENSES"].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-xs font-display font-semibold tracking-wider transition-colors ${
                    i === 0 ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {transactions.map((t, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <t.icon className="w-5 h-5 text-primary" />
                  </div>
                  {t.time && <span className="text-muted-foreground text-[10px]">{t.time}</span>}
                </div>
                <h4 className="font-display font-semibold text-foreground text-sm">{t.label}</h4>
                {t.desc && <p className="text-muted-foreground text-[10px] tracking-wider">{t.desc}</p>}
                <p className={`font-display font-bold text-xl mt-2 ${t.color}`}>{t.amount}</p>
              </div>
            ))}

            {/* Studio Lease */}
            <div className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-16 bg-secondary" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div />
                  <span className="text-primary text-[10px] tracking-wider font-semibold border border-primary/40 px-2 py-0.5 rounded">Recurring</span>
                </div>
                <h4 className="font-display font-semibold text-foreground text-sm mt-4">Studio Lease</h4>
                <p className="text-muted-foreground text-xs">Monthly property retainer for Sector 7 Headquarters.</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="font-display font-bold text-xl text-foreground">-$2,800.00</p>
                  <span className="text-muted-foreground text-[10px] tracking-wider">MANAGE</span>
                </div>
              </div>
            </div>

            {/* Failed */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <span className="text-destructive text-[10px] tracking-wider font-semibold">ACTION REQUIRED</span>
              </div>
              <h4 className="font-display font-semibold text-foreground text-sm">Failed Subscription</h4>
              <p className="text-muted-foreground text-xs">Lumina Premium - Seat 04</p>
              <div className="flex items-center justify-between mt-2">
                <p className="font-display font-bold text-xl text-primary">$12.99</p>
                <button className="text-foreground text-[10px] tracking-wider font-semibold border border-border px-3 py-1 rounded hover:bg-secondary transition-colors">
                  RETRY
                </button>
              </div>
            </div>
          </div>

          {/* FAB */}
          <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </BubbleLayout>
  );
};

export default PaymentsPage;
