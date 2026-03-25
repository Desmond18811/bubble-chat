import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

// ─── Static data ──────────────────────────────────────────────────────────────
const NAV_ICONS = [
  { icon: "chat", label: "Chats", path: "/messages" },
  { icon: "work", label: "Work", path: "/workspace" },
  { icon: "video_chat", label: "Meet", path: "/meet" },
  { icon: "group", label: "Community", path: "/community" },
  { icon: "rss_feed", label: "Feed", path: "/feed" },
  { icon: "bookmark", label: "Saved", path: "/saved" },
  { icon: "calendar_today", label: "Calendar", path: "/calendar" },
  { icon: "payments", label: "Payments", path: "/payments" },
];

function MSIcon({
  icon,
  filled = false,
  className,
}: {
  icon: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
      }
    >
      {icon}
    </span>
  );
}

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  // We consider "/" as Feed as well based on previous implementations
  const currentPath = location.pathname === "/" ? "/feed" : location.pathname;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full z-50 bg-[#010f20]/95 backdrop-blur-2xl flex flex-col py-8 border-r border-[#3b495c]/20 shadow-2xl transition-all duration-300",
        isExpanded ? "w-64" : "w-[85px]"
      )}
    >
      {/* Toggle Button Container to make the whole top section clickable or just a button */}
      <div 
        className={cn(
            "mb-8 flex items-center cursor-pointer px-6 transition-all",
            isExpanded ? "justify-between" : "justify-center"
        )}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
      >
        {isExpanded ? (
           <img src="/placeholder.svg" alt="Bubble Logo" className="h-8 object-contain" />
        ) : (
           <div className="w-10 h-10 rounded-xl bg-[#ffe792] flex items-center justify-center">
             <span className="font-bold text-[#655400] text-sm font-headline">BB</span>
           </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex flex-col flex-grow gap-y-2 w-full mt-4">
        {NAV_ICONS.map(({ icon, label, path }) => {
          const isActive = currentPath === path;
          return (
            <Link
              key={label}
              to={path}
              title={isExpanded ? undefined : label}
              className={cn(
                "flex items-center py-3 border-l-4 transition-all duration-200 group mx-2 rounded-xl",
                isActive
                  ? "text-[#ffe792] border-[#ffe792] bg-[#ffe792]/10"
                  : "text-[#a2c2fd] border-transparent hover:text-[#ffe792] hover:bg-[#ffe792]/5"
              )}
            >
              <div className={cn("flex flex-shrink-0 items-center justify-center", isExpanded ? "w-16" : "w-16")}>
                <MSIcon icon={icon} filled={isActive} className="text-2xl" />
              </div>
              
              <span 
                className={cn(
                  "font-headline text-sm font-medium tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300",
                  isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col w-full gap-y-2 pt-6 border-t border-[#3b495c]/20">
        <Link
          to="/settings"
          title={isExpanded ? undefined : "Settings"}
          className={cn(
            "flex items-center py-3 transition-colors group mx-2 rounded-xl border-l-4",
            currentPath === "/settings"
                ? "text-[#ffe792] border-[#ffe792] bg-[#ffe792]/10"
                : "text-[#a2c2fd] border-transparent hover:text-[#ffe792] hover:bg-[#ffe792]/5"
          )}
        >
          <div className="flex flex-shrink-0 items-center justify-center w-16">
            <MSIcon icon="settings" filled={currentPath === "/settings"} className="text-2xl" />
          </div>
          <span 
            className={cn(
                "font-headline text-sm font-medium tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300",
                isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
            )}
           >
             Settings
          </span>
        </Link>
        
        {/* User Profile / Logout */}
        <Link
          to="/logout"
          title={isExpanded ? undefined : "Profile"}
          className="flex items-center py-3 transition-colors group mx-2 rounded-xl mt-2 hover:bg-[#ffe792]/5"
        >
          <div className="flex flex-shrink-0 items-center justify-center w-16">
            <div className="w-10 h-10 rounded-full border-2 border-[#11273f] bg-[#071a2f] overflow-hidden group-hover:border-[#ffe792]/50 transition-colors">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuChttp6jw4LsU4XItatDjPf-fNScHqUtTYGlrEd93i56yQ-Rm5a3fg0W710gHSpqqtIJWUkrDl8bNYrx2dEeFrwyLuJurQ9jkP9Ty_UmzGjz17El4GSdYqxw-TsdUB9KUvQ2PffvL8t1DjomGClY_pqx1QQ7yv5j9oi5obURo26eA2tLbAc9G9V4O0Eg6arDKRVEDoX1bSLTwuEQxaLOpvaYQLXSHuKhN2n8-AkJqDEW84gJlsmAYYJZ31tnvxdsL3LmcKjpCY1fq9O"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div 
            className={cn(
                "flex flex-col overflow-hidden transition-all duration-300",
                isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
            )}
          >
            <span className="font-headline text-sm font-bold text-[#d8e6ff] truncate">ALEX_DRAKE</span>
            <span className="text-[10px] text-[#9eacc3] truncate">Obsidian Edition</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
