/**
 * seed-reset.ts
 * DESTRUCTIVE — wipes the database to a clean slate so we can test the full
 * signup → onboarding → org → brain flow from scratch.
 *
 * Deletes EVERY: User, Organization, Conversation, Message, OrgDocument, Otp.
 *
 * Guarded: it will refuse to run unless you pass --yes (or CONFIRM_RESET=yes),
 * so it can't fire by accident.
 *
 * Run:
 *   npx ts-node scripts/seed-reset.ts --yes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../models/users';
import { Organization } from '../models/organizations';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';
import { OrgDocument } from '../models/orgDocument';
import { Otp } from '../models/otp';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble';

const confirmed = process.argv.includes('--yes') || process.env.CONFIRM_RESET === 'yes';

async function run() {
    if (!confirmed) {
        console.error('✋ Refusing to wipe the database without confirmation.');
        console.error('   Re-run with:  npx ts-node scripts/seed-reset.ts --yes');
        process.exit(1);
    }

    try {
        console.log('🔌 Connecting to MongoDB…');
        await mongoose.connect(MONGODB_URI);
        console.log(`✅ Connected to ${MONGODB_URI}\n`);

        const targets: [string, { deleteMany: (f: any) => Promise<{ deletedCount?: number }> }][] = [
            ['Messages', Message],
            ['Conversations', Conversation],
            ['OrgDocuments (brain)', OrgDocument],
            ['Organizations', Organization],
            ['OTPs', Otp],
            ['Users', User],
        ];

        for (const [label, model] of targets) {
            const { deletedCount } = await model.deleteMany({});
            console.log(`  🗑  ${label.padEnd(22)} deleted ${deletedCount ?? 0}`);
        }

        console.log('\n🧼 Database reset complete — clean slate.');
        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
