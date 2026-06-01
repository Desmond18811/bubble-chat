"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
    return (
        <section className="relative overflow-hidden bg-background py-20 sm:py-32">
            {/* Animated background bubbles */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    animate={{
                        y: [0, -20, 0],
                        x: [0, 10, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
                />
                <motion.div
                    animate={{
                        y: [0, 20, 0],
                        x: [0, -10, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
                    >
                        Overview
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
                    >
                        Features Built for the{" "}
                        <span className="text-primary">Global Workspace</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground"
                    >
                        A better and faster way to communicate and collaborate across the globe.
                        Connect with your team, manage workspaces, and achieve more together.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
                    >
                        <Link to="/signup">
                            <Button
                                size="lg"
                                className="group rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90"
                            >
                                Get Started for Free
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
