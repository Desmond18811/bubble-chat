/**
 * seed-org-team.ts
 * Creates ONE organization with a founder + a team of members, exactly the way
 * the real signup flow does it:
 *
 *   1. A single "founder" signs up   →  creates the Organization
 *                                        (invite/organizational code + default
 *                                         group chat with Aida).
 *   2. Every other member "joins"    →  via that same organizational code,
 *                                        landing in the org + default group chat.
 *
 * The result is a set of boilerplate template users that are all in the same
 * group — ready for end-to-end testing of the onboarding flow.
 *
 * NOTE: the org's brain (Pinecone namespace) is created empty. This script does
 * NOT seed/upload any documents — that is done manually afterwards.
 *
 * Run:
 *   npx ts-node scripts/seed-org-team.ts
 *
 * Optional overrides (env):
 *   SEED_TEAM_COUNT   total members to create (founder + employees). Default: full roster.
 *   SEED_ORG_NAME     organization name.       Default: 'Bubble HQ'
 *   SEED_PASSWORD     login password for all.  Default: 'BubbleTest2026!'
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../models/users';
import { Organization } from '../models/organizations';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';

// Inlined from controllers/aidaController.ts:getAidaBotUser — keeps this script
// self-contained so we don't drag the whole Aida controller (OpenAI/pinecone) in.
async function getAidaBotUser() {
    let bot = await User.findOne({ is_bot: true, username: 'aida' });
    if (!bot) {
        bot = await User.create({
            full_name: 'Aida',
            username: 'aida',
            email: 'aida@bubble.internal',
            bio: 'Your intelligent workspace companion. Ask me anything about your organization, tasks, meetings, and more.',
            is_bot: true,
            isVerified: true,
            verified_badge: true,
            avatar: '',
            uniqueTag: 'bubble-AIDA-001',
        });
        console.log('[Aida] Bot user created:', bot._id);
    }
    return bot;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble';
const PASSWORD = process.env.SEED_PASSWORD || 'BubbleTest2026!';

// ── The organization everyone belongs to ─────────────────────────────────────
const ORG = {
    name: process.env.SEED_ORG_NAME || 'ETHEGEN',
    industry: 'Technology',
    size: '51-200' as const,
};

// ── Team roster ───────────────────────────────────────────────────────────────
// First entry is the FOUNDER (signs up + creates the org). The rest JOIN via the
// organizational code. Each member has a name, a role ("what they do in the group")
// and a bio.
interface Member {
    full_name: string;
    email: string;
    org_role: string;
    department: string;
    bio: string;
}

const FOUNDER: Member = {
    full_name: 'Desmond Ubi',
    email: 'founder@bubblehq.test',
    org_role: 'Founder & CEO',
    department: 'leadership',
    bio: 'Building the operating system for modern teams. Sets vision and strategy.',
};

const TEAM: Member[] = [
    { full_name: 'Amara Osei', email: 'amara.osei@bubblehq.test', org_role: 'Software Engineer', department: 'engineering', bio: 'Full-stack dev, loves Rust & distributed systems.' },
    { full_name: 'Liam Thornton', email: 'liam.thornton@bubblehq.test', org_role: 'Senior Software Engineer', department: 'engineering', bio: 'TypeScript fanatic. Owns the core API.' },
    { full_name: 'Priya Nair', email: 'priya.nair@bubblehq.test', org_role: 'Engineering Manager', department: 'engineering', bio: 'Leads the backend guild. Ex-Google.' },
    { full_name: 'Marcus Webb', email: 'marcus.webb@bubblehq.test', org_role: 'ML Engineer', department: 'engineering', bio: 'Trains models and explains them to stakeholders.' },
    { full_name: 'Yuki Tanaka', email: 'yuki.tanaka@bubblehq.test', org_role: 'Data Scientist', department: 'data', bio: 'Turns raw data into actionable insights.' },
    { full_name: 'Sophie Laurent', email: 'sophie.laurent@bubblehq.test', org_role: 'DevOps Engineer', department: 'engineering', bio: 'Kubernetes all the things. CI/CD architect.' },
    { full_name: 'Fatima Al-Rashid', email: 'fatima.alrashid@bubblehq.test', org_role: 'Product Manager', department: 'product', bio: 'Bridges engineering and business goals.' },
    { full_name: 'Oliver Chang', email: 'oliver.chang@bubblehq.test', org_role: 'Security Engineer', department: 'engineering', bio: 'OWASP advocate. Penetration testing enthusiast.' },
    { full_name: 'Nadia Kowalski', email: 'nadia.kowalski@bubblehq.test', org_role: 'QA Engineer', department: 'engineering', bio: 'Automation-first testing with Cypress & Playwright.' },
    { full_name: 'Chloe Dubois', email: 'chloe.dubois@bubblehq.test', org_role: 'Creative Director', department: 'design', bio: 'Award-winning design leader. Ex-Pentagram.' },
    { full_name: 'Jake Morrison', email: 'jake.morrison@bubblehq.test', org_role: 'UI Designer', department: 'design', bio: 'Beautiful interfaces for complex problems.' },
    { full_name: 'Sven Eriksson', email: 'sven.eriksson@bubblehq.test', org_role: 'UX Designer', department: 'design', bio: 'Design systems and component libraries.' },
    { full_name: 'Maya Patel', email: 'maya.patel@bubblehq.test', org_role: 'UX Researcher', department: 'design', bio: 'User testing and discovery interviews.' },
    { full_name: 'Rafael Torres', email: 'rafael.torres@bubblehq.test', org_role: 'Content Strategist', department: 'marketing', bio: 'SEO-driven storytelling for global audiences.' },
    { full_name: 'Bianca Romano', email: 'bianca.romano@bubblehq.test', org_role: 'Growth Manager', department: 'marketing', bio: 'Paid social and growth experiments.' },
    { full_name: 'James Okafor', email: 'james.okafor@bubblehq.test', org_role: 'Finance Lead', department: 'finance', bio: 'Steers capital allocation and FP&A.' },
    { full_name: 'Amelia Foster', email: 'amelia.foster@bubblehq.test', org_role: 'Operations Manager', department: 'operations', bio: 'Keeps the org running and SLAs honored.' },
    { full_name: 'Sandra Obi', email: 'sandra.obi@bubblehq.test', org_role: 'HR Manager', department: 'hr', bio: 'Talent acquisition and people strategy.' },
    { full_name: 'Tom Bradley', email: 'tom.bradley@bubblehq.test', org_role: 'Product Manager', department: 'product', bio: 'Customer-first product design advocate.' },
    { full_name: 'Rosa Carvalho', email: 'rosa.carvalho@bubblehq.test', org_role: 'Customer Success Manager', department: 'support', bio: 'Enterprise client retention and QBRs.' },
    { full_name: 'Nathan Grove', email: 'nathan.grove@bubblehq.test', org_role: 'AI Researcher', department: 'engineering', bio: 'LLMs for knowledge retrieval and summarisation.' },
    { full_name: 'Leo Adebayo', email: 'leo.adebayo@bubblehq.test', org_role: 'Backend Engineer', department: 'engineering', bio: 'APIs, integrations and infra glue.' },
    { full_name: 'Zoe Phillips', email: 'zoe.phillips@bubblehq.test', org_role: 'Business Analyst', department: 'operations', bio: 'Process optimisation and data-driven decisions.' },
    { full_name: 'Kwame Asante', email: 'kwame.asante@bubblehq.test', org_role: 'Support Engineer', department: 'support', bio: 'Onboarding and technical support.' },
];

// ── Procedural fill (if SEED_TEAM_COUNT exceeds the named roster) ─────────────
const FIRST_NAMES = ['Aria', 'Noah', 'Zara', 'Idris', 'Mila', 'Kofi', 'Lena', 'Omar', 'Ruth', 'Tariq', 'Eva', 'Yara', 'Hugo', 'Nina', 'Sami', 'Lola', 'Dario', 'Anya', 'Felix', 'Mara'];
const LAST_NAMES = ['Bello', 'Novak', 'Reyes', 'Haddad', 'Larsson', 'Mensah', 'Costa', 'Khan', 'Stone', 'Ito', 'Vega', 'Cole', 'Ferraro', 'Singh', 'Abara', 'Walsh'];
const ROLES = ['Software Engineer', 'Product Designer', 'Data Analyst', 'Account Manager', 'Operations Associate', 'Marketing Specialist', 'Support Specialist'];
const DEPTS = ['engineering', 'design', 'data', 'sales', 'operations', 'marketing', 'support'];

function generateMember(i: number): Member {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const role = ROLES[i % ROLES.length];
    const dept = DEPTS[i % DEPTS.length];
    return {
        full_name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}.${i}@bubblehq.test`,
        org_role: role,
        department: dept,
        bio: `${role} on the ${dept} team.`,
    };
}

function buildRoster(): Member[] {
    const requested = parseInt(process.env.SEED_TEAM_COUNT || '0', 10);
    const all = [FOUNDER, ...TEAM];
    if (!requested || requested <= all.length) return requested > 0 ? all.slice(0, requested) : all;
    // Need more than the named roster — top up procedurally.
    for (let i = all.length; i < requested; i++) {
        all.push(generateMember(i));
    }
    return all;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateUniqueTagSync(name: string, index: number): string {
    const base = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 6) || 'user';
    const suffix = (1000 + index).toString();
    return `${base}-${suffix}`;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function run() {
    try {
        console.log('🔌 Connecting to MongoDB…');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.\n');

        const roster = buildRoster();
        const [founder, ...members] = roster;
        const hashedPassword = await bcrypt.hash(PASSWORD, 12);

        // Make sure the Aida bot exists (same one real signup adds to group chats).
        const bot = await getAidaBotUser();
        const botId = bot ? bot._id : null;

        // ── 1. FOUNDER signs up + creates the organization ───────────────────
        let org = await Organization.findOne({ name: ORG.name });
        let founderUser = await User.findOne({ email: founder.email });

        if (org && founderUser) {
            console.log(`⚠  Organization "${ORG.name}" + founder already exist — reusing.\n`);
        } else {
            if (!founderUser) {
                founderUser = await User.create({
                    full_name: founder.full_name,
                    email: founder.email,
                    password: hashedPassword,
                    organization: ORG.name,
                    org_role: founder.org_role,
                    org_industry: ORG.industry,
                    org_size: ORG.size,
                    department: founder.department,
                    role: 'admin',
                    bio: founder.bio,
                    avatar: `https://i.pravatar.cc/150?u=${founder.email}`,
                    uniqueTag: generateUniqueTagSync(founder.full_name, 0),
                    isVerified: true,
                    onboardingComplete: true,
                    isOnline: false,
                    lastSeen: new Date(),
                });
                console.log(`👤 Founder created: ${founder.full_name} (${founder.org_role})`);
            }

            const inviteCode = crypto.randomBytes(16).toString('hex').toUpperCase();
            org = await Organization.create({
                name: ORG.name,
                industry: ORG.industry,
                size: ORG.size,
                owner: founderUser._id,
                inviteCode,
                pineconeNamespace: `org-${founderUser._id}`,
            });
            await User.findByIdAndUpdate(founderUser._id, { organizationId: org._id });

            // NOTE: brain/document seeding intentionally skipped — uploaded manually later.

            // Default group chat — everyone who joins lands here.
            const defaultChat = await Conversation.create({
                chatName: ORG.name,
                isGroupChat: true,
                users: botId ? [founderUser._id, botId] : [founderUser._id],
                groupAdmin: founderUser._id,
                groupIcon: 'black',
                groupDescription: `Default group chat for ${ORG.name}`,
                organizationId: org._id,
                isDefaultOrgChat: true,
            });

            if (botId) {
                const welcome = `👋 **Welcome to the ${ORG.name} Workspace on Bubble!**\n\nI am **Aida**, your workspace intelligence assistant. I will automatically index shared resources and meeting transcripts to grow our collective business brain.\n\nAll members who join will automatically be added to this default group chat. Feel free to collaborate, share documents, schedule calls, and ask me anything!`;
                const initialMsg = await Message.create({
                    chat: defaultChat._id,
                    sender: botId,
                    content: welcome,
                    message_type: 'text',
                });
                defaultChat.latestMessage = (initialMsg as any)._id;
                await defaultChat.save();
            }
            console.log(`🏢 Organization "${ORG.name}" created with group chat (brain left empty).\n`);
        }

        const inviteCode = org!.inviteCode;
        const defaultChat = await Conversation.findOne({ organizationId: org!._id, isDefaultOrgChat: true });

        // ── 2. Every other member JOINS via the organizational code ──────────
        let created = 0;
        let skipped = 0;

        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const existing = await User.findOne({ email: m.email });
            if (existing) {
                console.log(`  ⚠  Skipping (exists): ${m.email}`);
                skipped++;
                continue;
            }

            const member = await User.create({
                full_name: m.full_name,
                email: m.email,
                password: hashedPassword,
                // Joining via invite code → mirror the real join flow.
                organization: org!.name,
                organizationId: org!._id,
                org_role: m.org_role,
                org_industry: org!.industry,
                org_size: org!.size,
                department: m.department,
                role: 'employee',
                bio: m.bio,
                avatar: `https://i.pravatar.cc/150?u=${m.email}`,
                app_background: ['bubbles', 'light', 'dark'][i % 3] as any,
                uniqueTag: generateUniqueTagSync(m.full_name, i + 1),
                isVerified: true,
                onboardingComplete: true,
                isOnline: false,
                lastSeen: new Date(),
            });

            // Add to the shared default group chat.
            if (defaultChat) {
                const ids = defaultChat.users.map((id: any) => id.toString());
                if (!ids.includes(member._id.toString())) {
                    defaultChat.users.push(member._id as any);
                }
            }

            console.log(`  ✅ [${i + 1}/${members.length}] ${m.full_name} — ${m.org_role} joined ${org!.name}`);
            created++;
        }

        if (defaultChat) await defaultChat.save();

        // ── Summary ──────────────────────────────────────────────────────────
        const totalMembers = await User.countDocuments({ organizationId: org!._id });
        console.log(`\n🎉 Done! Joined this run: ${created}  Skipped: ${skipped}`);
        console.log('──────────────────────────────────────────');
        console.log(`🏢 Organization:        ${org!.name}`);
        console.log(`🧠 Brain (namespace):   ${org!.pineconeNamespace}  (empty — upload docs manually)`);
        console.log(`👥 Total members:       ${totalMembers} (all in the "${org!.name}" group chat)`);
        console.log(`🔑 Organizational code: ${inviteCode}`);
        console.log(`👑 Founder login:       ${founder.email}`);
        console.log(`🔐 Password (all):      ${PASSWORD}`);
        console.log('──────────────────────────────────────────');
        console.log('   → Share the organizational code above so others can join this org.\n');

        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
