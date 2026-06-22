/**
 * seed-org-team.ts
 * Seeds a full software-engineering team (20 members) into an EXISTING organization,
 * identified by its invite code, and wires the first 5 into the founder's workroom
 * (mutual contacts + the org's default group chat) so they show up immediately in-app.
 *
 * The target org is the one whose `inviteCode` matches ORG_CODE below (override via env).
 * The founder is that org's `owner`. All members are created pre-verified + fully
 * onboarded, so they appear in the Workroom/Org-Members list right away.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-org-team.ts
 *
 * Optional env overrides:
 *   ORG_CODE        invite code of the org to seed into.  Default: A305AB9BC4A9B0E3738F9EF6A54FB7BC
 *   SEED_PASSWORD   password for every seeded member.     Default: BubbleTest2026!
 *   WORKROOM_COUNT  how many to add to the founder's workroom. Default: 5
 *
 * Login password for every account: BubbleTest2026!
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../models/users';
import { Organization } from '../models/organizations';
import { Conversation } from '../models/conversations';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble';
const ORG_CODE = (process.env.ORG_CODE || 'A305AB9BC4A9B0E3738F9EF6A54FB7BC').trim();
const PASSWORD = process.env.SEED_PASSWORD || 'BubbleTest2026!';
const WORKROOM_COUNT = Number(process.env.WORKROOM_COUNT || 5);

// ── A real-world software engineering team: 20 roles ──────────────────────────
interface Member {
  full_name: string;
  org_role: string;
  role: 'admin' | 'employee';
  department: string;
  bio: string;
}

const TEAM: Member[] = [
  { full_name: 'Tunde Bakare',     org_role: 'Engineering Manager',        role: 'admin',    department: 'engineering', bio: 'Leads the engineering org. Ex-startup CTO, ships fast and mentors hard.' },
  { full_name: 'Sarah Whitfield',  org_role: 'Tech Lead',                  role: 'employee', department: 'engineering', bio: 'Architecture owner. RFCs, code reviews, and unblocking the team.' },
  { full_name: 'Diego Marquez',    org_role: 'Senior Frontend Engineer',   role: 'employee', department: 'engineering', bio: 'React + TypeScript. Obsessed with accessibility and 60fps.' },
  { full_name: 'Aisha Bello',      org_role: 'Senior Backend Engineer',    role: 'employee', department: 'engineering', bio: 'Node, Postgres, and event-driven systems at scale.' },
  { full_name: 'Kevin Zhao',       org_role: 'Frontend Engineer',          role: 'employee', department: 'engineering', bio: 'Design-systems contributor. Loves a clean component API.' },
  { full_name: 'Lena Petrova',     org_role: 'Backend Engineer',           role: 'employee', department: 'engineering', bio: 'APIs, queues, and the occasional gnarly migration.' },
  { full_name: 'Marcus Reilly',    org_role: 'Full-Stack Engineer',        role: 'employee', department: 'engineering', bio: 'End-to-end feature owner. Comfortable everywhere in the stack.' },
  { full_name: 'Priya Sharma',     org_role: 'iOS Engineer',               role: 'employee', department: 'engineering', bio: 'Swift + SwiftUI. Pixel-perfect, buttery-smooth mobile.' },
  { full_name: 'Noah Andersen',    org_role: 'Android Engineer',           role: 'employee', department: 'engineering', bio: 'Kotlin, Compose, and offline-first architectures.' },
  { full_name: 'Fatima Yusuf',     org_role: 'DevOps Engineer',            role: 'employee', department: 'engineering', bio: 'Terraform, Kubernetes, and zero-downtime deploys.' },
  { full_name: 'Oliver Grant',     org_role: 'Site Reliability Engineer',  role: 'employee', department: 'engineering', bio: 'SLOs, on-call hygiene, and chaos testing.' },
  { full_name: 'Mei Tanaka',       org_role: 'QA Automation Engineer',     role: 'employee', department: 'engineering', bio: 'Playwright + CI gates. If it can break, she automates it.' },
  { full_name: 'Daniel Okoro',     org_role: 'QA Engineer',                role: 'employee', department: 'engineering', bio: 'Exploratory testing and release sign-off.' },
  { full_name: 'Hannah Cole',      org_role: 'Security Engineer',          role: 'employee', department: 'engineering', bio: 'Threat modeling, secrets hygiene, and OWASP top 10.' },
  { full_name: 'Rajesh Iyer',      org_role: 'Data Engineer',              role: 'employee', department: 'engineering', bio: 'Pipelines, warehouses, and trustworthy dashboards.' },
  { full_name: 'Sofia Almeida',    org_role: 'Machine Learning Engineer',  role: 'employee', department: 'engineering', bio: 'Model serving, evals, and pragmatic ML in production.' },
  { full_name: 'James Carter',     org_role: 'Product Manager',            role: 'employee', department: 'product',     bio: 'Roadmaps, discovery, and ruthless prioritization.' },
  { full_name: 'Chloe Martin',     org_role: 'Product Designer',           role: 'employee', department: 'design',      bio: 'UX flows, prototypes, and a tidy Figma library.' },
  { full_name: 'Ibrahim Sani',     org_role: 'Scrum Master',               role: 'employee', department: 'engineering', bio: 'Sprint cadence, retros, and clearing impediments.' },
  { full_name: 'Emma Larsson',     org_role: 'Technical Writer',           role: 'employee', department: 'engineering', bio: 'Docs, API references, and onboarding guides that don\'t suck.' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugifyName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '.').replace(/^\.|\.$/g, '').toLowerCase();
}

async function uniqueTagFor(name: string, index: number): Promise<string> {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 6) || 'user';
  for (let attempt = 0; attempt < 25; attempt++) {
    const tag = `${base}-${1000 + index + attempt}`;
    if (!(await User.findOne({ uniqueTag: tag }))) return tag;
  }
  return `${base}-${Date.now()}`;
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function run() {
  try {
    console.log('🔌 Connecting to MongoDB…');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected.\n');

    const org = await Organization.findOne({ inviteCode: ORG_CODE });
    if (!org) {
      console.error(`❌ No organization found with invite code "${ORG_CODE}".`);
      console.error('   Double-check the code, or create the org in-app first.');
      await mongoose.disconnect();
      process.exit(1);
      return;
    }

    const founder = await User.findById(org.owner);
    console.log(`🏢 Org:     ${org.name}  (${org.industry || 'n/a'}, ${org.size || 'n/a'})`);
    console.log(`👤 Founder: ${founder?.full_name || 'unknown'}  <${founder?.email || 'n/a'}>`);
    console.log(`🌱 Seeding ${TEAM.length} engineering-team members…\n`);

    const hashedPassword = await bcrypt.hash(PASSWORD, 12);
    const emailDomain = `${slugifyName(org.name).replace(/\./g, '')}.test`;

    const createdIds: mongoose.Types.ObjectId[] = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < TEAM.length; i++) {
      const m = TEAM[i];
      const email = `${slugifyName(m.full_name)}@${emailDomain}`;

      const existing = await User.findOne({ email });
      if (existing) {
        console.log(`  ⚠  Skipping (exists): ${email}`);
        createdIds.push(existing._id as mongoose.Types.ObjectId);
        skipped++;
        continue;
      }

      const uniqueTag = await uniqueTagFor(m.full_name, i + 1);

      const user = await User.create({
        full_name: m.full_name,
        email,
        password: hashedPassword,
        organization: org.name,
        organizationId: org._id,
        org_role: m.org_role,
        org_industry: org.industry || 'Technology',
        org_size: org.size,
        department: m.department,
        role: m.role,
        bio: m.bio,
        avatar: `https://i.pravatar.cc/150?u=${email}`,
        uniqueTag,
        isVerified: true,
        onboardingComplete: true,
        onboardingStep: 'complete',
        signupKind: 'organization',
        isOnline: false,
        lastSeen: new Date(),
      });

      createdIds.push(user._id as mongoose.Types.ObjectId);
      console.log(`  ✅ [${i + 1}/${TEAM.length}] ${m.full_name} — ${m.org_role}  (@${uniqueTag})`);
      created++;
    }

    // ── Wire the first N into the founder's workroom ────────────────────────────
    const workroomIds = createdIds.slice(0, Math.max(0, WORKROOM_COUNT));
    if (founder && workroomIds.length) {
      // Mutual contacts so they appear under "My Contacts" for the founder.
      await User.updateOne(
        { _id: founder._id },
        { $addToSet: { contacts: { $each: workroomIds } } }
      );
      await User.updateMany(
        { _id: { $in: workroomIds } },
        { $addToSet: { contacts: founder._id } }
      );

      // Add them to the org's default group chat (the "Workroom") if it exists.
      const defaultChat = await Conversation.findOne({
        organizationId: org._id,
        isGroupChat: true,
        isDefaultOrgChat: true,
      });
      if (defaultChat) {
        await Conversation.updateOne(
          { _id: defaultChat._id },
          { $addToSet: { users: { $each: [founder._id, ...workroomIds] } } }
        );
        console.log(`\n🤝 Added ${workroomIds.length} members to default group chat "${defaultChat.chatName}".`);
      } else {
        console.log('\n🤝 (No default org group chat found — added as mutual contacts only.)');
      }
      console.log(`   Founder workroom now includes ${workroomIds.length} new teammates.`);
    }

    console.log(`\n🎉 Done!  Created: ${created}   Skipped (existing): ${skipped}`);
    console.log('──────────────────────────────────────────');
    console.log(`📧 Email pattern:  <first>.<last>@${emailDomain}`);
    console.log(`🔑 Password:       ${PASSWORD}`);
    console.log(`🏢 Organization:   ${org.name}  (code ${ORG_CODE})`);
    console.log('──────────────────────────────────────────\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

run();
