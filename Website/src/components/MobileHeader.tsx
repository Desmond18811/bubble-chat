import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
    title: string;
    className?: string;
}

export function MobileHeader({ title, className }: MobileHeaderProps) {
    const toggleSidebar = () => {
        window.dispatchEvent(new CustomEvent('toggle-sidebar'));
    };

    return (
        <header
            className={cn(
                "flex md:hidden items-center justify-between px-8 h-20 fixed top-0 left-0 right-0 z-[40] transition-colors",
                "bg-[color-mix(in_srgb,var(--th-bg)_80%,transparent)] backdrop-blur-md border-bottom border-[var(--th-border)]",
                className
            )}
        >
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="Toggle Menu"
                >
                    <Icon name="menu" size={24} style={{ color: "#ffe792" }} />
                </button>
                <h1
                    className="text-base font-bold tracking-tight uppercase"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-accent)" }}
                >
                    {title}
                </h1>
            </div>
            <div className="w-8" /> {/* Spacer */}
        </header>
    );
}
