import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../models/users';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble-chat';

const seedMessages = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected for Messaging Data generation.');

    const alpha = await User.findOne({ username: 'alpha_explorer' });
    const beta = await User.findOne({ username: 'beta_explorer' });

    if (alpha && beta) {
        // Direct conversation
        let convo = await Conversation.findOne({ isGroupChat: false, users: { $all: [alpha._id, beta._id] } });
        if (!convo) {
            convo = await Conversation.create({
                isGroupChat: false,
                users: [alpha._id, beta._id],
                chatName: "Direct Interface"
            });
        }

        await Message.create([
            { sender: alpha._id, content: "Initial protocol sequence initiated?", chat: convo._id, message_type: "text" },
            { sender: beta._id, content: "Confirmed. Re-routing the subnet configurations right now.", chat: convo._id, message_type: "text" }
        ]);

        await Conversation.findByIdAndUpdate(convo._id, { latestMessage: (await Message.findOne({ chat: convo._id }).sort({ createdAt: -1 }))?._id });
        console.log('--- Embedded Messages ---');
    }

  } catch (error) {
    console.error('Error seeding messages:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedMessages();
