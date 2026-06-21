import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble-chat';

import { Conversation } from '../models/conversations';
import { User } from '../models/users';
import { Message } from '../models/messages';
import { getAidaBotUser } from '../controllers/aidaController';

async function testOnboardChat() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // Get a dummy user or create one
        let testUser = await User.findOne({ email: 'founder@bubble.test' });
        if (!testUser) {
            testUser = await User.create({
                full_name: 'Test Founder',
                email: 'founder@bubble.test',
                username: 'test_founder',
                isVerified: true,
                organization: 'Test Org',
            });
        }
        const userId = testUser._id;

        // Mock org ID
        const orgId = new mongoose.Types.ObjectId();

        console.log('Looking for default chat...');
        let defaultChat = await Conversation.findOne({
            organizationId: orgId,
            isDefaultOrgChat: true,
        });

        console.log('Retrieving Aida bot...');
        const bot = await getAidaBotUser();
        const botId = bot ? bot._id : null;

        console.log('Creating default chat...');
        if (!defaultChat) {
            defaultChat = await Conversation.create({
                chatName: 'Test Org Chat',
                isGroupChat: true,
                users: botId ? [userId, botId] : [userId],
                groupAdmin: userId,
                groupIcon: 'black',
                groupDescription: `Default group chat for Test Org`,
                organizationId: orgId,
                isDefaultOrgChat: true,
            });

            console.log('Default chat created successfully:', defaultChat._id);

            if (botId) {
                console.log('Creating welcome message...');
                const welcomeContent = `👋 **Welcome to the Test Workspace on Bubble!**`;
                const initialMsg = await Message.create({
                    chat: defaultChat._id,
                    sender: botId,
                    content: welcomeContent,
                    message_type: 'text',
                });
                console.log('Welcome message created:', initialMsg._id);
                
                defaultChat.latestMessage = (initialMsg as any)._id;
                console.log('Saving default chat...');
                await defaultChat.save();
                console.log('Default chat saved successfully.');
            }
        }
        console.log('SUCCESS!');
    } catch (err: any) {
        console.error('ERROR ENCOUNTERED:');
        console.error(err);
        if (err.stack) {
            console.error('STACK TRACE:');
            console.error(err.stack);
        }
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testOnboardChat();
