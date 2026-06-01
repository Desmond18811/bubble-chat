"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Plug, CreditCard, MessageCircle, Globe } from "lucide-react";

const faqGroups = [
    {
        icon: Globe,
        category: "Getting Started",
        items: [
            {
                question: "How is Bubblespace different?",
                answer:
                    "Bubblespace combines messaging, file collaboration, meetings, and a time-zone aware calendar in one place, so your team stops juggling five different tools.",
            },
            {
                question: "How long does setup take?",
                answer:
                    "Most teams are up and running in under five minutes. Invite your teammates, connect a calendar, and you're ready to collaborate.",
            },
        ],
    },
    {
        icon: Plug,
        category: "Integrations",
        items: [
            {
                question: "What can I sync with Bubblespace?",
                answer:
                    "Google Calendar, Outlook, Office 365, Apple Calendar, plus Slack, Teams, Zoom, and Google Meet for seamless scheduling.",
            },
            {
                question: "Do you offer an API?",
                answer:
                    "Yes. Our REST API and webhooks let you build custom workflows and connect Bubblespace to your internal tooling.",
            },
        ],
    },
    {
        icon: Shield,
        category: "Privacy & Security",
        items: [
            {
                question: "How is my data protected?",
                answer:
                    "All data is encrypted in transit and at rest. We never sell your data, and availability sharing never exposes event content.",
            },
            {
                question: "Are you compliant?",
                answer:
                    "Bubblespace is SOC 2 Type II compliant and supports SSO and granular admin controls for enterprise teams.",
            },
        ],
    },
    {
        icon: Zap,
        category: "Features",
        items: [
            {
                question: "Does the AI assistant cost extra?",
                answer:
                    "The AI assistant is included on Professional and Enterprise plans, with a limited number of free queries on the Free plan.",
            },
            {
                question: "Can I share availability externally?",
                answer:
                    "Absolutely. Share a private link with anyone — even people who don't use Bubblespace — to let them book time with you.",
            },
        ],
    },
    {
        icon: CreditCard,
        category: "Billing",
        items: [
            {
                question: "Is there a free plan?",
                answer:
                    "Yes, our free plan covers small teams with core messaging, file sharing, and calendar syncing for up to 2 calendars.",
            },
            {
                question: "Can I change plans anytime?",
                answer:
                    "You can upgrade, downgrade, or cancel at any time. Changes are prorated automatically on your next invoice.",
            },
        ],
    },
    {
        icon: MessageCircle,
        category: "Support",
        items: [
            {
                question: "How do I report a bug?",
                answer:
                    "Use the in-app feedback form or email support@bubblespace.com. We review every report and prioritize by impact.",
            },
            {
                question: "Do you offer onboarding help?",
                answer:
                    "Professional and Enterprise customers get guided onboarding and a dedicated success contact.",
            },
        ],
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FAQ() {
    return (
        <section id="faq" className="bg-background py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="mx-auto max-w-2xl text-center"
                >
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        FAQ
                    </span>
                    <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Frequently asked questions
                    </h2>
                    <p className="mt-4 text-pretty text-muted-foreground">
                        Everything you need to know, organized by topic.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                    className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {faqGroups.map((group) => (
                        <motion.div
                            key={group.category}
                            variants={itemVariants}
                            className="rounded-2xl border border-border bg-card p-6"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                    <group.icon className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-semibold text-foreground">
                                    {group.category}
                                </h3>
                            </div>
                            <div className="mt-5 space-y-5">
                                {group.items.map((item) => (
                                    <div key={item.question}>
                                        <p className="text-sm font-medium text-foreground">
                                            {item.question}
                                        </p>
                                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                            {item.answer}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
