import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../models/users';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble-chat';

const testUsers = [
  {
    full_name: 'Test Explorer Alpha',
    username: 'alpha_explorer',
    email: 'alpha@test.bubble.io',
    phone_number: '+10000000001',
    password: 'Password123!',
    uniqueTag: 'ALPHA123',
    isVerified: true,
    bio: 'Ready for transmission.',
  },
  {
    full_name: 'Test Explorer Beta',
    username: 'beta_explorer',
    email: 'beta@test.bubble.io',
    phone_number: '+10000000002',
    password: 'Password123!',
    uniqueTag: 'BETA123',
    isVerified: true,
    bio: 'Receiving signals loud and clear.',
  },
  {
    full_name: 'Test Explorer Gamma',
    username: 'gamma_explorer',
    email: 'gamma@test.bubble.io',
    phone_number: '+10000000003',
    password: 'Password123!',
    uniqueTag: 'GAMMA123',
    isVerified: true,
    bio: 'Exploring the outer digital rims.',
  }
];

const seedDatabase = async () => {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully.');

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists. Skipping.`);
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      await User.create({
        ...userData,
        password: hashedPassword
      });
      console.log(`Created user: ${userData.email}`);
    }

    console.log('\n--- Test Accounts Ready ---');
    testUsers.forEach(u => {
      console.log(`Email: ${u.email}`);
      console.log(`Phone: ${u.phone_number}`);
      console.log(`BubbleID: ${u.uniqueTag}`);
      console.log(`Password: ${u.password}`);
      console.log('---------------------------');
    });

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

seedDatabase();
