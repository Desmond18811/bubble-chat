import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble-chat';

import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';

async function cleanupTestChat() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        console.log('Searching for conversations with chatName "Test Org Chat"...');
        const testChats = await Conversation.find({ chatName: 'Test Org Chat' });
        console.log(`Found ${testChats.length} test conversations.`);

        for (const chat of testChats) {
            console.log(`Deleting messages for conversation ${chat._id}...`);
            const msgResult = await Message.deleteMany({ chat: chat._id });
            console.log(`Deleted ${msgResult.deletedCount} messages.`);

            console.log(`Deleting conversation ${chat._id}...`);
            await Conversation.deleteOne({ _id: chat._id });
            console.log(`Deleted conversation.`);
        }

        console.log('Cleanup complete!');
    } catch (err: any) {
        console.error('Error during cleanup:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

cleanupTestChat();
