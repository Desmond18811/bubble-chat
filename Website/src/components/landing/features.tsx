"use client";

import { motion } from "framer-motion";
import { Building2, Users, Lock } from "lucide-react";

const features = [
    {
        icon: Building2,
        title: "Build For The Modern Workforce",
        description:
            "Leverage single sign-on (SSO) to access your schedules safely and securely.",
    },
    {
        icon: Users,
        title: "The Perfect Meeting",
        description:
            "Set work hours and find a time that works for everyone in your organization.",
    },
    {
        icon: Lock,
        title: "Privacy for Everyone",
        description:
            "Bubblespace only shows your calendar availability and will never reveal the content of your calendar.",
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
        },
    },
};

export function Features() {
    return (
        <section id="features" className="bg-muted/30 py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid gap-8 md:grid-cols-3"
                >
                    {features.map((feature) => (
                        <motion.div
                            key={feature.title}
                            variants={itemVariants}
                            className="flex flex-col items-center text-center"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                                <feature.icon className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="mt-6 text-lg font-semibold text-foreground">
                                {feature.title}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
