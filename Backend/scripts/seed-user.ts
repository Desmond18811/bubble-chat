/**
 * seed-user.ts
 * Seeds exactly ONE user — nothing else. No organization, no brain, no group chat.
 *
 * The user is created UNVERIFIED and NOT onboarded, so you can drive the real
 * flow (OTP verification → onboarding → create organization → seed the brain)
 * through the app and test it end-to-end.
 *
 * NOTE: because this record already exists, the app's initial /register POST will
 * 409 on this email (register blocks existing emails). To test from here you
 * either: verify this existing user (resend-otp → verify-otp) then onboard, OR
 * run `seed-reset.ts --yes` first and register a brand-new account in-app.
 *
 * Run:
 *   npx ts-node scripts/seed-user.ts
 *
 * Optional overrides (env):
 *   SEED_NAME      full name.  Default: 'Test Founder'
 *   SEED_EMAIL     email.      Default: 'founder@bubble.test'
 *   SEED_PASSWORD  password.   Default: 'BubbleTest2026!'
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../models/users';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble';

const NAME = process.env.SEED_NAME || 'Test Founder';
const EMAIL = (process.env.SEED_EMAIL || 'founder@bubble.test').toLowerCase();
const PASSWORD = process.env.SEED_PASSWORD || 'BubbleTest2026!';

async function uniqueTagFor(name: string): Promise<string> {
    const base = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 6) || 'user';
    for (let attempt = 0; attempt < 20; attempt++) {
        const tag = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
        if (!(await User.findOne({ uniqueTag: tag }))) return tag;
    }
    return `${base}-${Date.now()}`;
}

async function run() {
    try {
        console.log('🔌 Connecting to MongoDB…');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.\n');

        const existing = await User.findOne({ email: EMAIL });
        if (existing) {
            console.log(`⚠  A user with ${EMAIL} already exists — leaving it as-is.`);
            console.log('   Run `npx ts-node scripts/seed-reset.ts --yes` first for a clean slate.\n');
            await mongoose.disconnect();
            return;
        }

        const hashedPassword = await bcrypt.hash(PASSWORD, 12);
        const uniqueTag = await uniqueTagFor(NAME);

        const user = await User.create({
            full_name: NAME,
            email: EMAIL,
            password: hashedPassword,
            uniqueTag,
            isVerified: false,        // must verify via OTP
            onboardingComplete: false, // must go through onboarding
            // no organization / organizationId — created during onboarding in-app
            role: 'employee',
        });

        console.log('🌱 Seeded one unverified user (no org, no brain):');
        console.log('──────────────────────────────────────────');
        console.log(`   Name:      ${user.full_name}`);
        console.log(`   Email:     ${user.email}`);
        console.log(`   Password:  ${PASSWORD}`);
        console.log(`   Verified:  ${user.isVerified}   Onboarded: ${user.onboardingComplete}`);
        console.log('──────────────────────────────────────────');
        console.log('   → Verify (resend-otp → verify-otp), then onboard + create the org/brain in-app.\n');

        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
