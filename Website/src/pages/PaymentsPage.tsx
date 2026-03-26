import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/Sidebar";


// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = { icon: string; label: string; active?: boolean };
type FilterTab = "All" | "Income" | "Expenses";
type Transaction = {
  id: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  amount: string;
  amountColor?: string;
  time?: string;
  badge?: { label: string; color: string };
  size: "sm" | "md" | "lg" | "lg-image";
  imageSrc?: string;
  error?: boolean;
  income?: boolean;
  iconFilled?: boolean;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { icon: "chat", label: "Chats" },
  { icon: "work", label: "Work" },
  { icon: "video_chat", label: "Meet" },
  { icon: "groups", label: "Community" },
  { icon: "rss_feed", label: "Feed" },
  { icon: "bookmark", label: "Saved" },
  { icon: "calendar_today", label: "Calendar" },
  { icon: "payments", label: "Payments", active: true },
];

const TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    icon: "cloud_queue",
    iconBg: "rgba(255,231,146,0.10)",
    iconColor: "#ffe792",
    title: "Nebula Cloud Services",
    subtitle: "Automated hosting payment",
    amount: "-$420.00",
    time: "2 hours ago",
    size: "lg",
  },
  {
    id: 2,
    icon: "shopping_bag",
    iconBg: "rgba(162,194,253,0.10)",
    iconColor: "#a2c2fd",
    title: "Design Assets",
    subtitle: "Store Purchase",
    amount: "-$89.50",
    amountColor: "#ffe792",
    size: "sm",
  },
  {
    id: 3,
    icon: "call_received",
    iconBg: "#ffe792",
    iconColor: "#655400",
    title: "Project Dividend",
    subtitle: "External wire transfer",
    amount: "+$5,200.00",
    amountColor: "#ffe792",
    time: "Yesterday",
    size: "lg",
    income: true,
  },
  {
    id: 4,
    icon: "coffee",
    iconBg: "#11273f",
    iconColor: "#9eacc3",
    title: "Observer Cafe",
    subtitle: "",
    amount: "-$4.20",
    size: "sm",
  },
  {
    id: 5,
    icon: "home",
    iconBg: "",
    iconColor: "",
    title: "Studio Lease",
    subtitle: "Monthly property retainer for Sector 7 Headquarters.",
    amount: "-$2,800.00",
    size: "lg-image",
    badge: { label: "Recurring", color: "rgba(255,231,146,0.10)" },
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC2UGzzyeYfg8VnyNmvPHeriHzdf4PDh0TObHJUOQ4lyDdzfFVXvG88TGCkqZ62ypWPtU38ejPD9NA-I5RjeUIc8vhX9qeb-txYZig8bFeBxIuTxXukWuWalhMdvrVoed09WCgtRzE-fhZJEEc135hqSmY5bWoqp3Xw-63u9LwxJbuKhcp09a4n-tIfhB2fQ8CRhcE_7mk0v6J_KB0DpmSF8Km5drp_HZ8A_oscOy9rS3JCQ3kFvbGRPhNRfV8teLsibPBgw_VQQkVs",
  },
  {
    id: 6,
    icon: "warning",
    iconBg: "rgba(255,113,108,0.10)",
    iconColor: "#ff716c",
    title: "Failed Subscription",
    subtitle: "Lumina Premium - Seat 04",
    amount: "$12.99",
    amountColor: "#ff716c",
    badge: { label: "Action Required", color: "rgba(255,113,108,0.15)" },
    size: "md",
    error: true,
  },
];

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
      className="fixed top-0 w-full z-40 h-20 flex items-center justify-between px-8"
      style={{
        paddingLeft: "8rem",
        background: "rgba(1,15,32,0.80)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}
    >
      <div className="flex items-center gap-8">
        <h1
          className="text-2xl font-bold tracking-tighter"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#ffe792" }}
        >
          Payments
        </h1>
        <div className="relative">
          <MSIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "#a2c2fd", fontSize: "18px" }}
          />
          <Input
            placeholder="Search transactions..."
            className="pl-9 pr-4 py-2 text-sm w-64 rounded-full border-none focus-visible:ring-1 focus-visible:ring-yellow-300/20"
            style={{ background: "#11273f", color: "#d8e6ff" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {["notifications", "help"].map((icon) => (
          <button
            key={icon}
            className="transition-colors"
            style={{ color: "#a2c2fd" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#ffe792")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#a2c2fd")
            }
          >
            <MSIcon name={icon} />
          </button>
        ))}
        <div
          className="h-10 w-10 rounded-full overflow-hidden border"
          style={{ borderColor: "rgba(59,73,92,0.30)" }}
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

function BalanceSidebar() {
  return (
    <section
      className="w-1/3 p-8 border-r overflow-y-auto"
      style={{
        borderColor: "rgba(59,73,92,0.10)",
        background: "rgba(3,20,39,0.30)",
      }}
    >
      <div className="sticky top-8 space-y-10">
        {/* Balance Card */}
        <div
          className="p-8 rounded-2xl relative overflow-hidden"
          style={{ background: "#0c2037" }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
            style={{ background: "rgba(255,231,146,0.05)" }}
          />
          <div className="relative z-10">
            <span
              className="text-xs uppercase tracking-widest"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: "#9eacc3",
              }}
            >
              Available Balance
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className="text-4xl font-bold"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#ffe792",
                }}
              >
                $42,890
              </span>
              <span className="text-lg" style={{ color: "#a2c2fd" }}>
                .65
              </span>
            </div>
            <div className="mt-6 flex gap-4">
              <Button
                className="flex-1 py-3 rounded-full font-bold text-sm border-0 transition-transform hover:scale-105 active:scale-95"
                style={{ background: "#ffe792", color: "#655400", height: "auto" }}
              >
                Deposit
              </Button>
              <Button
                variant="outline"
                className="flex-1 py-3 rounded-full font-bold text-sm transition-colors"
                style={{
                  background: "#11273f",
                  color: "#d8e6ff",
                  borderColor: "rgba(59,73,92,0.15)",
                  height: "auto",
                }}
              >
                Withdraw
              </Button>
            </div>
          </div>
        </div>

        {/* Wallet Insights */}
        <div className="space-y-6">
          <h3
            className="text-lg font-semibold tracking-tight px-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Wallet Insights
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {/* Monthly Yield */}
            <div
              className="p-6 rounded-xl border"
              style={{
                background: "#071a2f",
                borderColor: "rgba(59,73,92,0.05)",
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: "rgba(255,231,146,0.10)" }}
                >
                  <MSIcon
                    name="trending_up"
                    style={{ color: "#ffe792" }}
                  />
                </div>
                <span
                  className="text-[10px] uppercase"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "#ffe792",
                  }}
                >
                  +12.4%
                </span>
              </div>
              <span
                className="block text-xs uppercase tracking-widest"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#9eacc3",
                }}
              >
                Monthly Yield
              </span>
              <span
                className="text-xl font-semibold mt-1 block"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                $1,240.00
              </span>
            </div>

            {/* Connected Accounts */}
            <div
              className="p-6 rounded-xl border"
              style={{
                background: "#071a2f",
                borderColor: "rgba(59,73,92,0.05)",
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: "rgba(162,194,253,0.10)" }}
                >
                  <MSIcon
                    name="account_balance_wallet"
                    style={{ color: "#a2c2fd" }}
                  />
                </div>
                <span
                  className="text-[10px] uppercase"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "#9eacc3",
                  }}
                >
                  Active
                </span>
              </div>
              <span
                className="block text-xs uppercase tracking-widest"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#9eacc3",
                }}
              >
                Connected Accounts
              </span>
              <div className="flex -space-x-2 mt-3">
                {["BN", "CH", "AX"].map((abbr) => (
                  <div
                    key={abbr}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px]"
                    style={{
                      background: "#1a1a1a",
                      borderColor: "#010f20",
                    }}
                  >
                    {abbr}
                  </div>
                ))}
                <div
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px]"
                  style={{
                    background: "#11273f",
                    borderColor: "#010f20",
                    color: "#ffe792",
                  }}
                >
                  +2
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BubbleWise AI */}
        <div
          className="p-8 rounded-xl border relative cursor-pointer overflow-hidden group"
          style={{
            background: "linear-gradient(to bottom right, #0c2037, #010f20)",
            borderColor: "rgba(255,231,146,0.20)",
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(255,231,146,0.05)" }}
          />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <MSIcon
              name="auto_awesome"
              filled
              style={{ color: "#ffe792" }}
            />
            <h4
              className="font-bold text-sm tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BubbleWise AI
            </h4>
          </div>
          <p
            className="text-xs leading-relaxed relative z-10"
            style={{ color: "#9eacc3" }}
          >
            "Your subscription spending increased by 8% this month. Consider
            consolidating your cloud storage to save $45/mo."
          </p>
          <div
            className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest relative z-10"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#ffe792",
            }}
          >
            <span>Optimization View</span>
            <MSIcon name="arrow_forward" className="text-xs" style={{ fontSize: "14px" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function TransactionCard({ tx }: { tx: Transaction }) {
  const cardBase: React.CSSProperties = {
    background: "#031427",
    borderColor: "rgba(59,73,92,0.10)",
  };

  if (tx.size === "lg-image") {
    return (
      <div
        className="break-inside-avoid rounded-xl overflow-hidden border transition-all group"
        style={cardBase}
        onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,231,146,0.20)")
        }
        onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor =
          "rgba(59,73,92,0.10)")
        }
      >
        <div
          className="h-32 relative overflow-hidden"
          style={{ background: "#11273f" }}
        >
          <img
            src={tx.imageSrc}
            alt="Transaction visual"
            className="w-full h-full object-cover opacity-40"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, #031427, transparent)",
            }}
          />
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h5
              className="font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {tx.title}
            </h5>
            {tx.badge && (
              <Badge
                className="text-[10px] px-2 py-1 rounded font-normal border-0"
                style={{
                  background: tx.badge.color,
                  color: "#ffe792",
                }}
              >
                {tx.badge.label}
              </Badge>
            )}
          </div>
          <p className="text-xs mb-6" style={{ color: "#9eacc3" }}>
            {tx.subtitle}
          </p>
          <div className="flex justify-between items-center">
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {tx.amount}
            </span>
            <button
              className="text-[10px] uppercase tracking-widest hover:underline"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: "#ffe792",
              }}
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tx.size === "sm") {
    return (
      <div
        className="break-inside-avoid rounded-xl p-6 border transition-all"
        style={cardBase}
        onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,231,146,0.20)")
        }
        onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor =
          "rgba(59,73,92,0.10)")
        }
      >
        {tx.subtitle ? (
          <div className="flex items-center gap-4 mb-4">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: tx.iconBg }}
            >
              <MSIcon name={tx.icon} style={{ color: tx.iconColor }} />
            </div>
            <div>
              <h5
                className="font-bold text-sm"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {tx.title}
              </h5>
              <span
                className="text-[10px] uppercase"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#9eacc3",
                }}
              >
                {tx.subtitle}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded flex items-center justify-center"
                style={{ background: tx.iconBg }}
              >
                <MSIcon
                  name={tx.icon}
                  className="text-xs"
                  style={{ color: tx.iconColor, fontSize: "16px" }}
                />
              </div>
              <span
                className="font-bold text-sm"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {tx.title}
              </span>
            </div>
            <span
              className="text-sm font-bold"
              style={tx.amountColor ? { color: tx.amountColor } : {}}
            >
              {tx.amount}
            </span>
          </div>
        )}
        {tx.subtitle && (
          <span
            className="text-xl font-bold"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              ...(tx.amountColor ? { color: tx.amountColor } : {}),
            }}
          >
            {tx.amount}
          </span>
        )}
      </div>
    );
  }

  // md / lg
  return (
    <div
      className="break-inside-avoid rounded-xl p-6 border transition-all group relative overflow-hidden"
      style={cardBase}
      onMouseEnter={(e) =>
      ((e.currentTarget as HTMLElement).style.borderColor =
        "rgba(255,231,146,0.20)")
      }
      onMouseLeave={(e) =>
      ((e.currentTarget as HTMLElement).style.borderColor =
        "rgba(59,73,92,0.10)")
      }
    >
      {tx.income && (
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"
          style={{ background: "rgba(255,231,146,0.05)" }}
        />
      )}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div
          className={`flex items-center justify-center ${tx.size === "lg" ? "h-12 w-12 rounded-lg" : "h-10 w-10 rounded-full"}`}
          style={{
            background: tx.iconBg,
            ...(tx.income
              ? { boxShadow: "0 0 20px rgba(255,231,146,0.3)" }
              : {}),
          }}
        >
          <MSIcon name={tx.icon} style={{ color: tx.iconColor }} />
        </div>
        <div className="flex flex-col items-end gap-1">
          {tx.time && (
            <span
              className="text-xs"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: "#9eacc3",
              }}
            >
              {tx.time}
            </span>
          )}
          {tx.badge && (
            <span
              className="text-[10px] uppercase font-semibold"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: tx.error ? "#ff716c" : "#ffe792",
              }}
            >
              {tx.badge.label}
            </span>
          )}
        </div>
      </div>

      <h5
        className={`font-bold relative z-10 ${tx.size === "lg" ? "text-lg" : "text-sm"}`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {tx.title}
      </h5>
      <p className="text-xs mt-1 relative z-10" style={{ color: "#9eacc3" }}>
        {tx.subtitle}
      </p>

      <div
        className={`relative z-10 flex items-center justify-between ${tx.size === "lg" ? "mt-8" : "mt-4"}`}
      >
        <span
          className={`font-bold ${tx.size === "lg" ? "text-2xl" : "text-lg"}`}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            ...(tx.amountColor ? { color: tx.amountColor } : {}),
          }}
        >
          {tx.amount}
        </span>
        {tx.size === "lg" && !tx.error && (
          <MSIcon
            name="receipt_long"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "#a2c2fd" }}
          />
        )}
        {tx.error && (
          <button
            className="px-3 py-1 rounded-full text-[10px] uppercase"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: "#11273f",
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function TransactionsGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const filters: FilterTab[] = ["All", "Income", "Expenses"];

  const filtered =
    activeFilter === "All"
      ? TRANSACTIONS
      : activeFilter === "Income"
        ? TRANSACTIONS.filter((t) => t.income)
        : TRANSACTIONS.filter((t) => !t.income);

  return (
    <section className="flex-1 p-8 overflow-y-auto">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Recent Activity
          </h2>
          <p className="text-sm mt-1" style={{ color: "#9eacc3" }}>
            Real-time ledger of your luminous transactions
          </p>
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-2 text-xs uppercase tracking-widest rounded-full transition-colors"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background:
                  activeFilter === f ? "#071a2f" : "transparent",
                color: activeFilter === f ? "#d8e6ff" : "#9eacc3",
              }}
              onMouseEnter={(e) => {
                if (activeFilter !== f)
                  (e.currentTarget as HTMLElement).style.color = "#ffe792";
              }}
              onMouseLeave={(e) => {
                if (activeFilter !== f)
                  (e.currentTarget as HTMLElement).style.color = "#9eacc3";
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {filtered.map((tx) => (
          <TransactionCard key={tx.id} tx={tx} />
        ))}
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function PaymentsDashboard() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "#010f20", color: "#d8e6ff" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        body { font-family: 'Manrope', sans-serif; }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      <Sidebar />
      <TopBar />

      <main className="flex" style={{ marginLeft: "6rem", paddingTop: "5rem", minHeight: "100vh" }}>
        <BalanceSidebar />
        <TransactionsGrid />
      </main>

      {/* FAB */}
      <button
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center z-50 transition-transform hover:scale-110 active:scale-90 shadow-2xl"
        style={{
          background: "#ffe792",
          color: "#655400",
          boxShadow: "0 25px 50px rgba(255,231,146,0.20)",
        }}
      >
        <MSIcon name="add" className="text-3xl" />
      </button>
    </div>
  );
}