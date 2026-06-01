import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { Search, Bell, HelpCircle, Settings } from "lucide-react";

const BubbleLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b border-border flex items-center px-6 gap-4 bg-background/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
          <span className="font-headline font-bold text-primary text-lg tracking-wide uppercase">BUBBLE SPACE</span>
          <div className="flex-1 max-w-md mx-4">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search Bubblespace..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"><Bell className="w-5 h-5" /></button>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"><HelpCircle className="w-5 h-5" /></button>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"><Settings className="w-5 h-5" /></button>
            <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden" />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

export default BubbleLayout;
