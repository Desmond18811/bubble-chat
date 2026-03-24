import BubbleLayout from "@/components/BubbleLayout";
import { Users, Globe, MessageCircle, TrendingUp } from "lucide-react";

const communities = [
  { name: "Design Collective", members: "2.4K", desc: "UI/UX designers pushing boundaries in the Bubble ecosystem", active: true },
  { name: "Dev Hub", members: "5.1K", desc: "Full-stack developers building the next-gen protocols", active: false },
  { name: "Crypto Architects", members: "1.8K", desc: "Web3 infrastructure and decentralized systems", active: false },
  { name: "Motion Lab", members: "890", desc: "Animation and motion design for digital interfaces", active: false },
];

const CommunityPage = () => {
  return (
    <BubbleLayout>
      <div className="flex-1 overflow-auto scrollbar-thin p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display font-bold text-foreground text-3xl mb-2">Community</h1>
          <p className="text-muted-foreground text-sm mb-8">Connect with like-minded beings across the Bubble network.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {communities.map((c) => (
              <div key={c.name} className={`bg-card rounded-2xl border p-6 cursor-pointer transition-colors ${c.active ? "border-primary" : "border-border hover:border-primary/30"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-muted-foreground text-xs">{c.members} members</span>
                </div>
                <h3 className="font-display font-bold text-foreground text-lg mb-1">{c.name}</h3>
                <p className="text-muted-foreground text-sm">{c.desc}</p>
                <button className={`mt-4 font-display font-semibold text-xs tracking-wider px-4 py-2 rounded-lg transition-colors ${c.active ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-secondary"}`}>
                  {c.active ? "JOINED" : "JOIN"}
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Globe, label: "Global Nodes", value: "12,450" },
              { icon: MessageCircle, label: "Active Discussions", value: "3,280" },
              { icon: TrendingUp, label: "Weekly Growth", value: "+8.4%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl border border-border p-5 text-center">
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground text-[10px] tracking-widest mb-1">{stat.label.toUpperCase()}</p>
                <p className="font-display font-bold text-foreground text-2xl">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BubbleLayout>
  );
};

export default CommunityPage;
