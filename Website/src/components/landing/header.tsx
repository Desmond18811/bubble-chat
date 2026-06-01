"use client";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BubblespaceLogo } from "@/components/bubblespace-logo";
import { Globe } from "lucide-react";

export function Header() {
    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2">
                        <BubblespaceLogo className="h-8 w-8" />
                        <span className="text-xl font-semibold text-foreground">Bubblespace</span>
                    </Link>
                    <nav className="hidden items-center gap-6 md:flex">
                        <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                            Features
                        </a>
                        <a href="#use-cases" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                            Use Cases
                        </a>
                        <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                            FAQ
                        </a>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <button className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
                        <Globe className="h-4 w-4" />
                        EN
                    </button>
                    <Link to="/login">
                        <Button className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.header>
    );
}
