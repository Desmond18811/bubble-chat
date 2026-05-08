import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/users';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const ORGANIZATION = 'Bubble Space';
const PASSWORD = 'password123';

const ROLES = ['employee', 'admin', 'HR'];
const JOB_TITLES = [
    'Software Engineer', 'Senior Software Engineer', 'Product Manager',
    'UX Designer', 'Data Scientist', 'DevOps Engineer', 'Sales Representative',
    'Marketing Lead', 'HR Specialist', 'Customer Success'
];

async function generateUniqueTag(base: string): Promise<string> {
    let tag: string;
    let exists: boolean;
    const cleanBase = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bubble';
    do {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const suffix = Array.from({ length: 8 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        tag = `${cleanBase}-${suffix}`;
        exists = !!(await User.findOne({ uniqueTag: tag }));
    } while (exists);
    return tag;
}

async function run() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bubble';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const hashedPassword = await bcrypt.hash(PASSWORD, 12);

        const usersCount = 50;
        const users = [];

        for (let i = 1; i <= usersCount; i++) {
            const fullName = `Test User ${i}`;
            const email = `testuser${i}@bubblespace.xyz`;
            const uniqueTag = await generateUniqueTag(`testuser${i}`);
            const role = ROLES[Math.floor(Math.random() * ROLES.length)];
            const jobTitle = JOB_TITLES[Math.floor(Math.random() * JOB_TITLES.length)];

            users.push({
                full_name: fullName,
                email: email,
                password: hashedPassword,
                organization: ORGANIZATION,
                org_role: jobTitle,
                role: role,
                uniqueTag,
                isVerified: true,
                onboardingComplete: true,
                isOnline: false,
                lastSeen: new Date(),
            });
        }

        await User.insertMany(users);
        console.log(`Successfully created ${usersCount} test users in organization "${ORGANIZATION}"`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error generating users:', err);
    }
}

run();
