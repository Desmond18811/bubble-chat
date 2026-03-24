import { ReactNode } from "react";
import BubbleSidebar from "./BubbleSidebar";
import { Search, Bell, HelpCircle, Settings } from "lucide-react";

const BubbleLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background">
      <BubbleSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b border-border flex items-center px-6 gap-4">
          <span className="font-display font-bold text-foreground text-lg tracking-wide">BUBBLE</span>
          <div className="flex-1 max-w-md mx-4">
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Explore the Luminous..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button className="text-muted-foreground hover:text-foreground transition-colors"><Bell className="w-5 h-5" /></button>
            <button className="text-muted-foreground hover:text-foreground transition-colors"><HelpCircle className="w-5 h-5" /></button>
            <button className="text-muted-foreground hover:text-foreground transition-colors"><Settings className="w-5 h-5" /></button>
            <div className="w-8 h-8 rounded-full bg-secondary border border-border" />
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default BubbleLayout;
