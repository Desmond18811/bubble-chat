/**
 * seed-50-employees.ts
 * Creates 50 diverse test employees across 5 organisations, 10 industries, and
 * a wide range of roles — designed for end-to-end testing of Bubble Space.
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/seed-50-employees.ts
 *
 * Login password for every account: BubbleTest2026!
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../models/users';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble';
const PASSWORD = 'BubbleTest2026!';

// ── 5 Organisations —————————————————————————————————————
const ORGS: { name: string; industry: string; size: string }[] = [
    { name: 'Nexus Analytics', industry: 'Technology', size: '51-200' },
    { name: 'GreenLeaf Capital', industry: 'Finance & Banking', size: '201-500' },
    { name: 'PulseHealth', industry: 'HealthTech', size: '51-200' },
    { name: 'Orbit Creative', industry: 'Media & Entertainment', size: '11-50' },
    { name: 'SwiftLogix', industry: 'Logistics & Supply Chain', size: '201-500' },
];

// ── Employee roster: 50 people —————————————————————————
interface Employee {
    full_name: string;
    email: string;
    org_role: string;
    org: number; // index into ORGS
    role: 'admin' | 'employee';
    bio: string;
}

const EMPLOYEES: Employee[] = [
    // ── Nexus Analytics (org 0, Technology) ─────────────────
    { full_name: 'Amara Osei', email: 'amara.osei@nexus.test', org_role: 'Software Engineer', org: 0, role: 'employee', bio: 'Full-stack dev, loves Rust & distributed systems.' },
    { full_name: 'Liam Thornton', email: 'liam.thornton@nexus.test', org_role: 'Senior Software Engineer', org: 0, role: 'employee', bio: 'TypeScript fanatic. Currently building the next big API.' },
    { full_name: 'Priya Nair', email: 'priya.nair@nexus.test', org_role: 'Engineering Manager', org: 0, role: 'admin', bio: 'Leading backend guild. Ex-Google.' },
    { full_name: 'Marcus Webb', email: 'marcus.webb@nexus.test', org_role: 'ML Engineer', org: 0, role: 'employee', bio: 'Training models and explaining them to stakeholders.' },
    { full_name: 'Yuki Tanaka', email: 'yuki.tanaka@nexus.test', org_role: 'Data Scientist', org: 0, role: 'employee', bio: 'Turning raw data into actionable insights.' },
    { full_name: 'Sophie Laurent', email: 'sophie.laurent@nexus.test', org_role: 'DevOps Engineer', org: 0, role: 'employee', bio: 'Kubernetes all the things. CI/CD pipeline architect.' },
    { full_name: 'Ethan Brooks', email: 'ethan.brooks@nexus.test', org_role: 'Staff Engineer', org: 0, role: 'employee', bio: 'Cross-team technical leadership & RFC author.' },
    { full_name: 'Fatima Al-Rashid', email: 'fatima.alrashid@nexus.test', org_role: 'Product Manager', org: 0, role: 'employee', bio: 'Bridging engineering and business goals.' },
    { full_name: 'Oliver Chang', email: 'oliver.chang@nexus.test', org_role: 'Security Engineer', org: 0, role: 'employee', bio: 'OWASP advocate. Penetration testing enthusiast.' },
    { full_name: 'Nadia Kowalski', email: 'nadia.kowalski@nexus.test', org_role: 'QA Engineer', org: 0, role: 'employee', bio: 'Automation-first testing. Cypress & Playwright daily.' },

    // ── GreenLeaf Capital (org 1, Finance) ──────────────────
    { full_name: 'James Okafor', email: 'james.okafor@greenleaf.test', org_role: 'CFO', org: 1, role: 'admin', bio: 'Steering capital allocation and financial strategy.' },
    { full_name: 'Clara Rhodes', email: 'clara.rhodes@greenleaf.test', org_role: 'Finance Manager', org: 1, role: 'employee', bio: 'Cash flow & FP&A specialist.' },
    { full_name: 'Henry Müller', email: 'henry.muller@greenleaf.test', org_role: 'Accountant', org: 1, role: 'employee', bio: 'Reconciliation and regulatory compliance.' },
    { full_name: 'Isla Bennett', email: 'isla.bennett@greenleaf.test', org_role: 'Investment Analyst', org: 1, role: 'employee', bio: 'DCF models and equity research.' },
    { full_name: 'Raj Gupta', email: 'raj.gupta@greenleaf.test', org_role: 'Risk Manager', org: 1, role: 'employee', bio: 'Portfolio risk and VaR analysis.' },
    { full_name: 'Amelia Foster', email: 'amelia.foster@greenleaf.test', org_role: 'Compliance Officer', org: 1, role: 'employee', bio: 'AML, KYC and regulatory filings.' },
    { full_name: 'David Kim', email: 'david.kim@greenleaf.test', org_role: 'Controller', org: 1, role: 'employee', bio: 'Managing GAAP-compliant reporting.' },
    { full_name: 'Zoe Phillips', email: 'zoe.phillips@greenleaf.test', org_role: 'Business Analyst', org: 1, role: 'employee', bio: 'Process optimisation and data-driven decisions.' },
    { full_name: 'Marco Ricci', email: 'marco.ricci@greenleaf.test', org_role: 'Quantitative Analyst', org: 1, role: 'employee', bio: 'Stochastic models for derivatives pricing.' },
    { full_name: 'Sandra Obi', email: 'sandra.obi@greenleaf.test', org_role: 'HR Manager', org: 1, role: 'employee', bio: 'Talent acquisition and people strategy.' },

    // ── PulseHealth (org 2, HealthTech) ─────────────────────
    { full_name: 'Dr. Elena Voss', email: 'elena.voss@pulsehealth.test', org_role: 'CTO', org: 2, role: 'admin', bio: 'Building the operating system for modern healthcare.' },
    { full_name: 'Carlos Mendez', email: 'carlos.mendez@pulsehealth.test', org_role: 'Software Engineer', org: 2, role: 'employee', bio: 'FHIR & HL7 integrations. HIPAA-compliant systems.' },
    { full_name: 'Aisha Diallo', email: 'aisha.diallo@pulsehealth.test', org_role: 'Clinical Data Analyst', org: 2, role: 'employee', bio: 'Turning EMR data into patient outcome insights.' },
    { full_name: 'Tom Bradley', email: 'tom.bradley@pulsehealth.test', org_role: 'Product Manager', org: 2, role: 'employee', bio: 'Clinician-first product design advocate.' },
    { full_name: 'Maya Patel', email: 'maya.patel@pulsehealth.test', org_role: 'UX Researcher', org: 2, role: 'employee', bio: 'User testing with medical professionals.' },
    { full_name: 'Nathan Grove', email: 'nathan.grove@pulsehealth.test', org_role: 'AI Researcher', org: 2, role: 'employee', bio: 'LLMs for clinical note summarisation.' },
    { full_name: 'Leila Hassan', email: 'leila.hassan@pulsehealth.test', org_role: 'Regulatory Affairs Lead', org: 2, role: 'employee', bio: 'FDA 510(k) submissions and CE marking.' },
    { full_name: 'Finn O\'Sullivan', email: 'finn.osullivan@pulsehealth.test', org_role: 'Backend Engineer', org: 2, role: 'employee', bio: 'Node & Python microservices for telehealth.' },
    { full_name: 'Ingrid Lindqvist', email: 'ingrid.lindqvist@pulsehealth.test', org_role: 'Operations Manager', org: 2, role: 'employee', bio: 'Clinical partnerships and SLA management.' },
    { full_name: 'Kwame Asante', email: 'kwame.asante@pulsehealth.test', org_role: 'Support Engineer', org: 2, role: 'employee', bio: 'Provider onboarding and technical support.' },

    // ── Orbit Creative (org 3, Media) ───────────────────────
    { full_name: 'Chloe Dubois', email: 'chloe.dubois@orbitcreative.test', org_role: 'Creative Director', org: 3, role: 'admin', bio: 'Award-winning design leader. Ex-Pentagram.' },
    { full_name: 'Jake Morrison', email: 'jake.morrison@orbitcreative.test', org_role: 'UI Designer', org: 3, role: 'employee', bio: 'Beautiful interfaces for complex problems.' },
    { full_name: 'Nia Osei', email: 'nia.osei@orbitcreative.test', org_role: 'Brand Manager', org: 3, role: 'employee', bio: 'Cohesive brand identity across all touchpoints.' },
    { full_name: 'Rafael Torres', email: 'rafael.torres@orbitcreative.test', org_role: 'Content Strategist', org: 3, role: 'employee', bio: 'SEO-driven storytelling for global audiences.' },
    { full_name: 'Luna Park', email: 'luna.park@orbitcreative.test', org_role: 'Motion Designer', org: 3, role: 'employee', bio: 'After Effects & Lottie animations.' },
    { full_name: 'Sven Eriksson', email: 'sven.eriksson@orbitcreative.test', org_role: 'UX Designer', org: 3, role: 'employee', bio: 'Design systems and component libraries.' },
    { full_name: 'Bianca Romano', email: 'bianca.romano@orbitcreative.test', org_role: 'Growth Manager', org: 3, role: 'employee', bio: 'Paid social and growth experiments.' },
    { full_name: 'Adil Farouk', email: 'adil.farouk@orbitcreative.test', org_role: 'Video Producer', org: 3, role: 'employee', bio: 'Documentary & brand storytelling.' },
    { full_name: 'Mei-Ling Zhang', email: 'meiling.zhang@orbitcreative.test', org_role: 'Account Executive', org: 3, role: 'employee', bio: 'Managing creative agency relationships.' },
    { full_name: 'Patrick Nguyen', email: 'patrick.nguyen@orbitcreative.test', org_role: 'Technical Writer', org: 3, role: 'employee', bio: 'Clear documentation for complex creative tools.' },

    // ── SwiftLogix (org 4, Logistics) ───────────────────────
    { full_name: 'Grace Okonkwo', email: 'grace.okonkwo@swiftlogix.test', org_role: 'COO', org: 4, role: 'admin', bio: 'Operational excellence across 3 continents.' },
    { full_name: 'Alexei Petrov', email: 'alexei.petrov@swiftlogix.test', org_role: 'Logistics Manager', org: 4, role: 'employee', bio: 'Route optimisation and last-mile delivery.' },
    { full_name: 'Tanya Williams', email: 'tanya.williams@swiftlogix.test', org_role: 'Supply Chain Analyst', org: 4, role: 'employee', bio: 'Demand forecasting and inventory modelling.' },
    { full_name: 'Bongani Dlamini', email: 'bongani.dlamini@swiftlogix.test', org_role: 'Warehouse Supervisor', org: 4, role: 'employee', bio: 'WMS implementation and team leadership.' },
    { full_name: 'Carmen Fuentes', email: 'carmen.fuentes@swiftlogix.test', org_role: 'Procurement Manager', org: 4, role: 'employee', bio: 'Vendor negotiation and contract management.' },
    { full_name: 'Daniel Achebe', email: 'daniel.achebe@swiftlogix.test', org_role: 'Fleet Manager', org: 4, role: 'employee', bio: 'EV fleet transition and telematics.' },
    { full_name: 'Hana Yoshida', email: 'hana.yoshida@swiftlogix.test', org_role: 'Customs Specialist', org: 4, role: 'employee', bio: 'International trade compliance and tariffs.' },
    { full_name: 'Leo Adebayo', email: 'leo.adebayo@swiftlogix.test', org_role: 'Software Engineer', org: 4, role: 'employee', bio: 'TMS integrations and API development.' },
    { full_name: 'Rosa Carvalho', email: 'rosa.carvalho@swiftlogix.test', org_role: 'Customer Success Manager', org: 4, role: 'employee', bio: 'Enterprise client retention and QBRs.' },
    { full_name: 'Victor Osei', email: 'victor.osei@swiftlogix.test', org_role: 'Operations Analyst', org: 4, role: 'employee', bio: 'KPI dashboards and process improvement.' },
];

// ── Helpers —————————————————————————————————————————————
function generateUniqueTagSync(name: string, index: number): string {
    const base = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 6) || 'user';
    const suffix = (1000 + index).toString().toUpperCase();
    return `${base}-${suffix}`;
}

// ── Main ————————————————————————————————————————————————
async function run() {
    try {
        console.log('🔌 Connecting to MongoDB…');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.\n');

        const hashedPassword = await bcrypt.hash(PASSWORD, 12);

        let created = 0;
        let skipped = 0;

        for (let i = 0; i < EMPLOYEES.length; i++) {
            const emp = EMPLOYEES[i];
            const org = ORGS[emp.org];

            const existing = await User.findOne({ email: emp.email });
            if (existing) {
                console.log(`  ⚠  Skipping (exists): ${emp.email}`);
                skipped++;
                continue;
            }

            const uniqueTag = generateUniqueTagSync(emp.full_name, i + 1);

            await User.create({
                full_name: emp.full_name,
                email: emp.email,
                password: hashedPassword,
                organization: org.name,
                org_role: emp.org_role,
                org_industry: org.industry,
                org_size: org.size,
                role: emp.role,
                bio: emp.bio,
                avatar: `https://i.pravatar.cc/150?u=${emp.email}`,
                app_background: ['bubbles', 'light', 'dark'][i % 3] as any,
                uniqueTag,
                isVerified: true,
                onboardingComplete: true,
                isOnline: false,
                lastSeen: new Date(),
            });

            console.log(`  ✅ [${i + 1}/50] ${emp.full_name} — ${emp.org_role} @ ${org.name}`);
            created++;
        }

        console.log(`\n🎉 Done! Created: ${created}  Skipped: ${skipped}`);
        console.log('──────────────────────────────────────────');
        console.log('📧 Email pattern:  <firstname>.<lastname>@<org>.test');
        console.log('🔑 Password:       BubbleTest2026!');
        console.log('🏢 Organisations:  Nexus Analytics | GreenLeaf Capital | PulseHealth | Orbit Creative | SwiftLogix');
        console.log('──────────────────────────────────────────\n');

        // Print one login per org for quick testing
        const samples = [0, 10, 20, 30, 40];
        console.log('📋 Quick-test accounts (one per org):');
        samples.forEach(idx => {
            const e = EMPLOYEES[idx];
            if (e) console.log(`   ${e.email}  →  ${e.org_role} @ ${ORGS[e.org].name}`);
        });
        console.log('\nAll accounts use password: BubbleTest2026!\n');

        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
