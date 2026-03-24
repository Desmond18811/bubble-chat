import { MessageSquare, Briefcase, MessageCircle, Users, Rss, Bookmark, Calendar, CreditCard, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { icon: MessageSquare, label: "CHATS", path: "/messages" },
  { icon: Briefcase, label: "WORK", path: "/workspace" },
  { icon: MessageCircle, label: "MEET", path: "/meet" },
  { icon: Users, label: "COMMUNITY", path: "/community" },
  { icon: Rss, label: "FEED", path: "/" },
  { icon: Bookmark, label: "SAVED", path: "/saved" },
  { icon: Calendar, label: "CALENDAR", path: "/calendar" },
  { icon: CreditCard, label: "PAYMENTS", path: "/payments" },
];

const BubbleSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-[72px] min-h-screen bg-sidebar flex flex-col items-center py-4 border-r border-border">
      <Link to="/" className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-6">
        <span className="font-display font-bold text-primary-foreground text-sm">B</span>
      </Link>

      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive =
            (item.label === "FEED" && location.pathname === "/") ||
            (item.label === "CHATS" && location.pathname === "/messages") ||
            (item.label === "WORK" && location.pathname === "/workspace");
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`relative flex flex-col items-center gap-1 w-14 py-2 rounded-lg text-[10px] tracking-wider transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1 mt-auto">
        <button className="flex flex-col items-center gap-1 w-14 py-2 rounded-lg text-[10px] tracking-wider text-sidebar-foreground hover:text-foreground transition-colors">
          <Settings className="w-5 h-5" />
          <span>SETTINGS</span>
        </button>
        <button className="flex flex-col items-center gap-1 w-14 py-2 rounded-lg text-[10px] tracking-wider text-sidebar-foreground hover:text-foreground transition-colors">
          <LogOut className="w-5 h-5" />
          <span>LOGOUT</span>
        </button>
      </div>
    </aside>
  );
};

export default BubbleSidebar;
