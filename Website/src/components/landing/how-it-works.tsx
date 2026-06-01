"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
    {
        badge: "How It Works",
        title: "My Workspace",
        description:
            "Sync all your communications in one place and eliminate the scheduling chaos with confidence.",
        features: [
            {
                number: 1,
                title: "Sync Your Calendar",
                description:
                    "Manage your personal and work schedules in one place. Bubblespace works with Gmail, Outlook, and Office 365 calendars.",
            },
            {
                number: 2,
                title: "Manage Files in Bubblespace",
                description:
                    "Add, edit, or delete files directly on Bubblespace to save yourself a step. Changes will be reflected on your other calendar platforms.",
            },
        ],
        image: (
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="flex items-center gap-4 border-b border-border pb-4">
                    <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-destructive/60" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                        <div className="h-3 w-3 rounded-full bg-primary/60" />
                    </div>
                    <span className="text-sm text-muted-foreground">Bubblespace</span>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <div key={day} className="text-center text-xs text-muted-foreground">
                            {day}
                        </div>
                    ))}
                    {Array.from({ length: 35 }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{ delay: i * 0.02 }}
                            viewport={{ once: true }}
                            className={`aspect-square rounded-md ${[3, 7, 12, 18, 24, 28].includes(i)
                                    ? "bg-primary"
                                    : [5, 15, 21, 30].includes(i)
                                        ? "bg-primary/40"
                                        : "bg-muted"
                                }`}
                        />
                    ))}
                </div>
            </div>
        ),
        reverse: false,
    },
    {
        badge: "How It Works",
        title: "Share Availability",
        description:
            "Share your availability with anyone, even if they are not on Bubblespace.",
        features: [
            {
                number: 1,
                title: "Manage Your Activity",
                description: "Keep up with last-minute schedule changes with a few clicks.",
            },
            {
                number: 2,
                title: "Suggest Specific Times or Share Your Schedule",
                description: "Share what works best for each situation.",
            },
        ],
        image: (
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20" />
                        <div>
                            <div className="h-3 w-24 rounded bg-muted" />
                            <div className="mt-1 h-2 w-16 rounded bg-muted" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {["9:00 AM", "10:30 AM", "2:00 PM", "3:30 PM", "4:00 PM", "5:00 PM"].map(
                            (time, i) => (
                                <motion.button
                                    key={time}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                    className={`rounded-lg border px-3 py-2 text-xs ${i === 1 ? "border-primary bg-primary/10 text-primary" : "border-border"
                                        }`}
                                >
                                    {time}
                                </motion.button>
                            )
                        )}
                    </div>
                </div>
            </div>
        ),
        reverse: true,
    },
    {
        badge: "How It Works",
        title: "Communication Hub",
        description:
            "Connect with your team members instantly through our integrated messaging system.",
        features: [
            {
                number: 1,
                title: "Real-time Messaging",
                description: "Chat with colleagues in real-time with read receipts and typing indicators.",
            },
            {
                number: 2,
                title: "Video Meetings",
                description: "Start or schedule video meetings directly from your workspace.",
            },
        ],
        image: (
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="space-y-3">
                    {[
                        { name: "Alex", message: "Hey team, ready for the meeting?", time: "9:42 AM", self: false },
                        { name: "You", message: "Yes, joining now!", time: "9:43 AM", self: true },
                        { name: "Sarah", message: "On my way!", time: "9:43 AM", self: false },
                    ].map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.self ? 20 : -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.2 }}
                            viewport={{ once: true }}
                            className={`flex ${msg.self ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.self
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground"
                                    }`}
                            >
                                {!msg.self && (
                                    <p className="text-xs font-medium text-primary">{msg.name}</p>
                                )}
                                <p className="text-sm">{msg.message}</p>
                                <p className={`text-xs ${msg.self ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {msg.time}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        ),
        reverse: false,
    },
];

export function HowItWorks() {
    return (
        <section className="bg-background py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="space-y-32">
                    {sections.map((section, index) => (
                        <motion.div
                            key={section.title}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className={`grid items-center gap-12 lg:grid-cols-2 ${section.reverse ? "lg:flex-row-reverse" : ""
                                }`}
                        >
                            <div className={section.reverse ? "lg:order-2" : ""}>
                                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                    {section.badge}
                                </span>
                                <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                    {section.title}
                                </h2>
                                <p className="mt-4 text-muted-foreground">{section.description}</p>
                                <div className="mt-8 space-y-6">
                                    {section.features.map((feature) => (
                                        <div key={feature.number} className="flex gap-4">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                                {feature.number}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground">
                                                    {feature.title}
                                                </h3>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {feature.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/signup">
                                    <Button className="group mt-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                                        Get Started for Free
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </Link>
                            </div>
                            <div className={section.reverse ? "lg:order-1" : ""}>
                                {section.image}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
