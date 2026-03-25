import React from 'react'
import { cn } from "@/lib/utils"

interface SideNavBarWideProps {
    userAvatar: string
    userName: string
    userSubtitle: string
}

const NAV_ICONS = [
    { icon: "chat", label: "Chat" },
    { icon: "work", label: "Work" },
    { icon: "video_chat", label: "Video" },
    { icon: "group", label: "Team" },
    { icon: "rss_feed", label: "Feed" },
    { icon: "bookmark", label: "Bookmarks" },
    { icon: "calendar_today", label: "Calendar" },
    { icon: "payments", label: "Payments" },
] as const

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

const SideNavBarWide: React.FC<SideNavBarWideProps> = ({ userAvatar, userName, userSubtitle }) => {
    return (
        <aside className="fixed left-0 top-0 h-full w-64 z-50 bg-[#010f20]/95 backdrop-blur-2xl flex flex-col py-8 border-r border-primary/10 shadow-2xl">
            {/* Logo Section */}
            <div className="px-8 mb-12 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(255,231,146,0.3)]">
                    <span className="material-symbols-outlined text-on-primary font-bold">bubble_chart</span>
                </div>
                <span className="font-headline text-2xl font-bold tracking-tighter text-on-background">
                    BUBBLE
                </span>
            </div>

            {/* User Profile Section */}
            <div className="px-6 mb-12">
                <div className="p-4 rounded-3xl bg-surface-container-high border border-primary/5 flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                        <img
                            src={userAvatar}
                            alt={userName}
                            className="w-20 h-20 rounded-full border-2 border-primary object-cover relative z-10"
                        />
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-[#010f20] rounded-full z-20" />
                    </div>
                    <h3 className="font-headline text-lg font-bold text-on-surface tracking-tight leading-none mb-1">
                        {userName}
                    </h3>
                    <p className="font-body text-[10px] uppercase tracking-widest text-primary font-bold opacity-80">
                        {userSubtitle}
                    </p>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-grow px-4 space-y-1">
                {NAV_ICONS.map((item) => (
                    <a
                        key={item.label}
                        href="#"
                        className="flex items-center gap-4 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-all duration-300 group"
                    >
                        <MSIcon icon={item.icon} className="text-2xl opacity-70 group-hover:opacity-100" />
                        <span className="font-headline text-sm font-medium tracking-tight whitespace-nowrap">
                            {item.label}
                        </span>
                    </a>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="px-4 mt-auto pt-8 border-t border-primary/5 space-y-1">
                <a href="#" className="flex items-center gap-4 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-all duration-300 group">
                    <MSIcon icon="settings" className="text-2xl opacity-70 group-hover:opacity-100" />
                    <span className="font-headline text-sm font-medium tracking-tight">Settings</span>
                </a>
                <a href="/logout" className="flex items-center gap-4 px-4 py-3 rounded-xl text-error hover:bg-error/5 transition-all duration-300 group">
                    <MSIcon icon="logout" className="text-2xl opacity-70 group-hover:opacity-100" />
                    <span className="font-headline text-sm font-medium tracking-tight">Logout</span>
                </a>
            </div>
        </aside>
    )
}

export default SideNavBarWide
