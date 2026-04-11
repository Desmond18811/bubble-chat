import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = "All" | "Income" | "Expenses";
type Transaction = {
  _id: string;
  type: "deposit" | "withdrawal" | "expense" | "income";
  amount: number;
  source?: string;
  description?: string;
  createdAt: string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MSIcon({
  name,
  filled = false,
  className = "",
  style,
}: {
  name: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {name}
    </span>
  );
}

function TopBar() {
  return (
    <header
      className="fixed top-0 right-0 z-40 h-20 flex items-center justify-between px-8 transition-colors"
      style={{
        left: "85px",
        background: "color-mix(in srgb, var(--th-bg) 80%, transparent)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}
    >
      <div className="flex items-center gap-8">
        <h1
          className="text-2xl font-bold tracking-tighter transition-colors"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-accent)" }}
        >
          Payments
        </h1>
        <div className="relative">
          <MSIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm transition-colors"
            style={{ color: "var(--th-secondary)", fontSize: "18px" }}
          />
          <Input
            placeholder="Search transactions..."
            className="pl-9 pr-4 py-2 text-sm w-64 rounded-full border-none transition-colors"
            style={{ background: "var(--th-surface-top)", color: "var(--th-text)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {["notifications", "help"].map((icon) => (
          <button
            key={icon}
            className="transition-colors"
            style={{ color: "var(--th-secondary)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--th-accent)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--th-secondary)")
            }
          >
            <MSIcon name={icon} />
          </button>
        ))}
        <div
          className="h-10 w-10 rounded-full overflow-hidden border transition-colors"
          style={{ borderColor: "var(--th-border)" }}
        >
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtq3NuWOsxhx0SUglzlnR5KpL5aWHJglBRRvHXCib8Qca7sbqtfxP77HY36X5GBJ2b1oKmqIG5H2Ojra-Z6xZbJkXRZjisgZPPf-fIVNu_dvhod22eGfRmVrNAkdccZ1hKtD3ZLN2FxoKf_9Iq4zU_F-kxOrpFb2OmOWTja761RYl9acv-4ZKEf4jUc5ioLXRB1atvDNVhmjXfJDthYzPvOZjnqVVMVDrtd7kVqpQt5F91Te9JNSyNf-4xq0RJi2gjLLff8RMEY5ga"
            alt="User profile"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}

function BalanceSidebar({ onRefresh, transactions }: { onRefresh: () => void, transactions: Transaction[] }) {
  const [loading, setLoading] = useState(false);
  const balance = transactions.reduce((acc, tx) => {
    return (tx.type === "deposit" || tx.type === "income") ? acc + tx.amount : acc - tx.amount;
  }, 0);
  
  const formattedBalance = balance.toFixed(2);
  const intPart = formattedBalance.split('.')[0];
  const decPart = formattedBalance.split('.')[1];

  const handleDeposit = async () => {
    try {
        setLoading(true);
        const res = await fetch("http://localhost:3000/api/v1/payment/deposit", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
            body: JSON.stringify({ amount: 500, source: "stripe_deposit" })
        });
        const data = await res.json();
        if (data.transaction) {
            toast.success("Deposit successful");
            onRefresh();
        } else {
            toast.error(data.message || "Failed to execute deposit.");
        }
    } catch (e) {
      toast.error("Deposit failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
        setLoading(true);
        const res = await fetch("http://localhost:3000/api/v1/payment/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
            body: JSON.stringify({ amount: 250, destination_account: "acct_1Ou" })
        });
        const data = await res.json();
        if (data.transaction) {
             toast.success("Withdrawal initiated");
             onRefresh();
        } else {
             toast.error(data.message || "Failed to execute withdrawal.");
        }
    } catch (e) {
        toast.error("Withdrawal failed.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <section
      className="w-1/3 p-8 border-r overflow-y-auto transition-colors z-10 relative"
      style={{
        borderColor: "var(--th-border)",
        background: "color-mix(in srgb, var(--th-surface-low) 50%, transparent)",
        backdropFilter: "blur(20px)"
      }}
    >
      <div className="sticky top-8 space-y-10">
        {/* Balance Card */}
        <div
          className="p-8 rounded-2xl relative overflow-hidden transition-colors"
          style={{ background: "var(--th-surface-high)" }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors"
            style={{ background: "color-mix(in srgb, var(--th-accent) 15%, transparent)" }}
          />
          <div className="relative z-10">
            <span
              className="text-xs uppercase tracking-widest transition-colors"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: "var(--th-muted)",
              }}
            >
              Ledger Balance
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className="text-4xl font-bold transition-colors"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "var(--th-accent)",
                }}
              >
                ₦{intPart}
              </span>
              <span className="text-lg transition-colors" style={{ color: "var(--th-secondary)" }}>
                .{decPart}
              </span>
            </div>
            <div className="mt-6 flex gap-4">
              <Button
                onClick={handleDeposit}
                disabled={loading}
                className="flex-1 py-3 rounded-full font-bold text-sm border-0 transition-transform hover:scale-105 active:scale-95"
                style={{ background: "var(--th-accent)", color: "var(--th-accent-text)", height: "auto" }}
              >
                {loading ? "Processing..." : "Deposit Top-up"}
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={loading}
                variant="outline"
                className="flex-1 py-3 rounded-full font-bold text-sm transition-colors"
                style={{
                  background: "var(--th-surface-top)",
                  color: "var(--th-text)",
                  borderColor: "var(--th-border)",
                  height: "auto",
                }}
              >
                 {loading ? "Processing..." : "Withdraw Funds"}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function TransactionCard({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === "deposit" || tx.type === "income";
  const icon = tx.type === "deposit" || tx.type === "income" ? "call_received" : "call_made";
  const iconColor = isIncome ? "var(--th-accent)" : "var(--th-secondary)";

  return (
    <div
      className="rounded-2xl p-6 transition-all group border"
      style={{
        background: "var(--th-surface)",
        borderColor: "transparent",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--th-border)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "transparent")
      }
    >
      <div className="flex justify-between items-start mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "var(--th-surface-top)", color: iconColor }}
        >
          <MSIcon name={icon} filled />
        </div>
      </div>
      <div>
        <h3 className="font-bold text-lg leading-tight mb-1 transition-colors capitalize" style={{ color: "var(--th-text)", fontFamily: "'Space Grotesk', sans-serif" }}>
          {tx.type}
        </h3>
        <p className="text-xs mb-4 line-clamp-1 transition-colors" style={{ color: "var(--th-muted)" }}>
          {tx.description || tx.source}
        </p>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold tracking-tight transition-colors" style={{ color: isIncome ? "var(--th-accent)" : "var(--th-text)" }}>
             {isIncome ? "+" : "-"}${tx.amount}
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold transition-colors" style={{ color: "var(--th-muted)" }}>
              {new Date(tx.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function TransactionsGrid({ transactions }: { transactions: Transaction[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const filters: FilterTab[] = ["All", "Income", "Expenses"];

  const filtered =
    activeFilter === "All"
      ? transactions
      : activeFilter === "Income"
        ? transactions.filter((t) => t.type === "deposit" || t.type === "income")
        : transactions.filter((t) => t.type === "withdrawal" || t.type === "expense");

  return (
    <section className="flex-1 p-8 overflow-y-auto relative z-10 custom-scrollbar">
      <div className="flex justify-between items-end mb-12 relative z-10">
        <div>
          <h2
            className="text-3xl font-bold tracking-tight transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}
          >
            Recent Activity
          </h2>
          <p className="text-sm mt-1 transition-colors" style={{ color: "var(--th-muted)" }}>
            Real-time ledger of your luminous transactions
          </p>
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-2 text-xs uppercase tracking-widest rounded-full transition-colors font-bold"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background:
                  activeFilter === f ? "var(--th-surface-high)" : "transparent",
                color: activeFilter === f ? "var(--th-text)" : "var(--th-muted)",
              }}
              onMouseEnter={(e) => {
                if (activeFilter !== f)
                  (e.currentTarget as HTMLElement).style.color = "var(--th-accent)";
              }}
              onMouseLeave={(e) => {
                if (activeFilter !== f)
                  (e.currentTarget as HTMLElement).style.color = "var(--th-muted)";
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="columns-1 lg:columns-2 gap-6 space-y-6 relative z-10">
        {filtered.length === 0 ? (
            <div className="p-8 text-center" style={{ color: "var(--th-muted)" }}>No transactions available.</div>
        ) : filtered.map((tx) => (
          <TransactionCard key={tx._id} tx={tx} />
        ))}
      </div>
    </section>
  );
}

// ─── Aida Sidebar ─────────────────────────────────────────────────────────────

function AidaFinancialAssistant({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <aside className="w-96 border-l h-full absolute right-0 top-0 bottom-0 z-50 flex flex-col transition-all"
          style={{ background: "color-mix(in srgb, var(--th-bg) 80%, var(--th-surface))", borderColor: "var(--th-border)", backdropFilter: "blur(20px)" }}>
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: "var(--th-border)" }}>
               <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background: "var(--th-accent)", color: "var(--th-accent-text)", fontFamily: "'Space Grotesk', sans-serif"}}>A</div>
                   <div>
                      <h4 className="font-bold text-sm transition-colors" style={{ color: "var(--th-text)"}}>Aida Financial</h4>
                      <p className="text-[10px] transition-colors" style={{ color: "var(--th-muted)" }}>Analyzing Your Ledger Data</p>
                   </div>
               </div>
               <button onClick={onClose} className="p-1 rounded-full transition-colors" style={{color: "var(--th-muted)"}}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--th-accent)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--th-muted)"}>
                   <MSIcon name="close" />
               </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
               <div className="bg-transparent border rounded-2xl p-4 text-sm" style={{borderColor: "var(--th-border)", color: "var(--th-text)"}}>
                   Hello! I am Aida. Based on your recent ledger activity, you've withdrawn a significant amount compared to your deposits this week. Would you like me to map out an expense-saving projection?
               </div>
            </div>
            <div className="p-4 border-t" style={{ borderColor: "var(--th-border)" }}>
               <div className="relative">
                   <Input placeholder="Ask Aida about your finances..." 
                     className="w-full rounded-xl pl-4 pr-10 py-3 border transition-colors" 
                     style={{background: "var(--th-surface)", color: "var(--th-text)", borderColor: "var(--th-border)"}} />
                   <button className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "var(--th-accent)" }}>
                       <MSIcon name="send" />
                   </button>
               </div>
            </div>
        </aside>
    );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function PaymentsDashboard() {
  const [data, setData] = useState<Transaction[]>([]);
  const [showAida, setShowAida] = useState(false);

  const fetchTx = async () => {
      try {
          const res = await fetch("http://localhost:3000/api/v1/payment/transactions", {
              headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` }
          });
          const json = await res.json();
          if (json.transactions) {
              setData(json.transactions);
          }
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
      fetchTx();
  }, []);

  return (
    <div
      className="min-h-screen transition-colors duration-300 overflow-hidden"
      style={{ background: "var(--th-bg)", color: "var(--th-text)", fontFamily: "'Manrope', sans-serif" }}
    >
      <Sidebar />
      <TopBar />

      <main className="flex relative" style={{ marginLeft: "85px", paddingTop: "5rem", minHeight: "100vh" }}>
        
        {/* Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors scale-150"
          style={{ background: "var(--th-glow)" }} />
        <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
          style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }} />

        <BalanceSidebar onRefresh={fetchTx} transactions={data} />
        <TransactionsGrid transactions={data} />

        <AidaFinancialAssistant isOpen={showAida} onClose={() => setShowAida(false)} />
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowAida(!showAida)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center z-50 transition-all hover:scale-110 active:scale-90 shadow-2xl"
        style={{
          background: "var(--th-accent)",
          color: "var(--th-accent-text)",
          boxShadow: showAida ? "0 0 40px var(--th-glow)" : "0 25px 50px color-mix(in srgb, var(--th-accent) 20%, transparent)",
        }}
      >
        <MSIcon name={showAida ? "close" : "smart_toy"} className="text-3xl" />
      </button>
    </div>
  );
}