"use client";

import { Link } from "react-router-dom";
import { BubblespaceLogo } from "@/components/bubblespace-logo";

const footerLinks = {
    About: ["Company", "Team", "Careers", "Blog"],
    Resources: ["Documentation", "Help Center", "Community", "Status"],
    Products: ["Workspace", "Calendar", "Meetings", "AI Assistant"],
    Social: ["Twitter", "LinkedIn", "GitHub", "Discord"],
};

export function Footer() {
    return (
        <footer className="border-t border-border bg-background py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-8 md:grid-cols-5">
                    <div className="md:col-span-1">
                        <Link to="/" className="flex items-center gap-2">
                            <BubblespaceLogo className="h-8 w-8" />
                            <span className="text-lg font-semibold text-foreground">Bubblespace</span>
                        </Link>
                    </div>
                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category}>
                            <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                            <ul className="mt-4 space-y-3">
                                {links.map((link) => (
                                    <li key={link}>
                                        <Link
                                            to="#"
                                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Bubblespace. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link to="#" className="text-sm text-muted-foreground hover:text-foreground">
                            Privacy Policy
                        </Link>
                        <Link to="#" className="text-sm text-muted-foreground hover:text-foreground">
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
