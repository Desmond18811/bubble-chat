"use client";

import { motion } from "framer-motion";
import {
    Rocket,
    Briefcase,
    GraduationCap,
    HeartPulse,
    Code2,
    Megaphone,
} from "lucide-react";

const useCases = [
    {
        icon: Rocket,
        title: "Startups & Founders",
        description:
            "Keep your lean team aligned across time zones. Run async standups, share docs, and ship faster without endless meetings.",
        tag: "Most popular",
    },
    {
        icon: Briefcase,
        title: "Remote Agencies",
        description:
            "Coordinate clients and contractors in one shared space. Track project files, approvals, and meeting notes effortlessly.",
    },
    {
        icon: Code2,
        title: "Engineering Teams",
        description:
            "Connect your repos, sync sprint calendars, and let the AI assistant summarize threads so engineers stay in flow.",
    },
    {
        icon: Megaphone,
        title: "Marketing Squads",
        description:
            "Plan campaigns on a shared timeline, collaborate on assets, and review content in real time across regions.",
    },
    {
        icon: GraduationCap,
        title: "Education & Cohorts",
        description:
            "Run online courses and study groups with scheduled sessions, shared resources, and instant messaging.",
    },
    {
        icon: HeartPulse,
        title: "Healthcare Teams",
        description:
            "Coordinate shifts and care schedules with privacy-first availability sharing that never exposes sensitive details.",
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function UseCases() {
    return (
        <section id="use-cases" className="bg-muted/30 py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="mx-auto max-w-2xl text-center"
                >
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        Use Cases
                    </span>
                    <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Built for every kind of team
                    </h2>
                    <p className="mt-4 text-pretty text-muted-foreground">
                        Wherever your people are, Bubblespace adapts to how your team
                        actually works.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                    className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {useCases.map((useCase) => (
                        <motion.div
                            key={useCase.title}
                            variants={itemVariants}
                            whileHover={{ y: -4 }}
                            className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
                        >
                            {useCase.tag && (
                                <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    {useCase.tag}
                                </span>
                            )}
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <useCase.icon className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
                            </div>
                            <h3 className="mt-5 text-lg font-semibold text-foreground">
                                {useCase.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {useCase.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
