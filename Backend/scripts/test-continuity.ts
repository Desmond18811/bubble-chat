import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/users';
import { Organization } from '../models/organizations';
import { OrgDocument } from '../models/orgDocument';
import { ExpertiseRadar } from '../models/expertiseRadar';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';
import { getOnboardingBrief, routeQuestion, resolveQAExchange } from '../controllers/continuityController';

dotenv.config({ path: path.join(__dirname, '../.env') });
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble-chat';

const mockResponse = () => {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  res.end = () => res;
  return res;
};

async function testContinuity() {
  console.log('🧪 Starting Knowledge Continuity Engine Integration Test...');
  await mongoose.connect(mongoURI);

  let org: any = null;
  let userA: any = null;
  let userB: any = null;
  let profileDoc: any = null;
  let generalDoc: any = null;
  let conversation: any = null;
  let questionMsg: any = null;
  let answerMsg: any = null;
  let resolvedDoc: any = null;

  try {
    // 1. Setup Org and Users
    org = await Organization.findOneAndUpdate(
      { name: 'Continuity Corp Test' },
      { name: 'Continuity Corp Test', owner: new mongoose.Types.ObjectId(), inviteCode: 'cont-code' },
      { upsert: true, new: true }
    );

    userA = await User.findOneAndUpdate(
      { email: 'newhire@continuity.test' },
      { email: 'newhire@continuity.test', username: 'new_hire', role: 'engineer', organization: org.name, password: 'password123' },
      { upsert: true, new: true }
    );

    userB = await User.findOneAndUpdate(
      { email: 'senior@continuity.test' },
      { email: 'senior@continuity.test', username: 'senior_eng', role: 'admin', organization: org.name, password: 'password123' },
      { upsert: true, new: true }
    );

    // 2. Setup Profile & General documents
    profileDoc = await OrgDocument.create({
      title: 'Company Handbook',
      content: 'Welcome to Continuity Corp. We specialize in AI solutions.',
      department: 'general',
      accessLevel: 'public',
      createdBy: userB._id,
      organizationId: org._id,
      tags: ['profile', 'onboarding'],
    });

    generalDoc = await OrgDocument.create({
      title: 'Architecture Overview',
      content: 'Our core tech stack is Node, React Native, MongoDB.',
      department: 'general',
      accessLevel: 'public',
      createdBy: userB._id,
      organizationId: org._id,
      tags: ['architecture'],
    });

    // Populate user B's expertise on architecture
    await ExpertiseRadar.findOneAndUpdate(
      { userId: userB._id, topic: 'architecture' },
      { organizationId: org._id, score: 50, activityCount: 10 },
      { upsert: true }
    );

    console.log('Test environment setup complete.');

    // 3. Test Onboarding Brief
    console.log('\n--- Step 1: Requesting Onboarding Brief for New Hire... ---');
    const briefReq: any = { user: userA };
    const briefRes = mockResponse();
    await getOnboardingBrief(briefReq, briefRes);

    if (briefRes.statusCode !== 200) {
      throw new Error(`Brief generation failed: ${JSON.stringify(briefRes.jsonData)}`);
    }

    const { brief } = briefRes.jsonData;
    console.log('✅ Success: Brief parsed.');
    console.log('- Company Name:', brief.companyName);
    console.log('- Overview Handbook:', brief.overview);
    console.log('- Recommended Docs Count:', brief.recommendedDocuments?.length);
    console.log('- Cached Experts on architecture:', brief.experts?.architecture ? 'FOUND' : 'NOT FOUND');

    // 4. Test Question Routing Helper
    console.log('\n--- Step 2: Routing Low-Confidence Question to Senior Expert... ---');
    const routeReq: any = {
      user: userA,
      body: {
        targetUserId: userB._id.toString(),
        question: 'How do we deploy the backend services on Railway?',
        contextText: 'Architecture Overview doc tags Node & MongoDB',
      },
    };
    const routeRes = mockResponse();
    await routeQuestion(routeReq, routeRes);

    if (routeRes.statusCode !== 201) {
      throw new Error(`Route question failed: ${JSON.stringify(routeRes.jsonData)}`);
    }

    const { conversationId, routedMessage } = routeRes.jsonData;
    console.log('✅ Success: Question routed.');
    console.log('- Created DM Conversation ID:', conversationId);
    console.log('- Prefilled Message:', routedMessage.content);

    conversation = await Conversation.findById(conversationId);
    questionMsg = routedMessage;

    // 5. Test Closed-Loop Q&A capture ("Save to Brain" action)
    console.log('\n--- Step 3: Simulating Answer & Triggering closed-loop QA ingestion... ---');
    
    // Simulate Senior User B answering
    answerMsg = await Message.create({
      chat: conversation._id,
      sender: userB._id,
      content: 'We use Railway git integration. Just push your code to the master branch and it builds automatically via Dockerfile.',
      message_type: 'text',
    });

    console.log(`Saved expert answer message ID: ${answerMsg._id}`);

    // Call QA resolve endpoint
    const resolveReq: any = {
      user: userA,
      body: { messageId: answerMsg._id.toString() },
    };
    const resolveRes = mockResponse();
    await resolveQAExchange(resolveReq, resolveRes);

    if (resolveRes.statusCode !== 201) {
      throw new Error(`QA resolve failed: ${JSON.stringify(resolveRes.jsonData)}`);
    }

    const { documentId, tags } = resolveRes.jsonData;
    console.log('✅ Success: Closed-loop Q&A ingestion triggered.');
    console.log('- Created document ID:', documentId);
    console.log('- Ingestion tags:', tags);

    resolvedDoc = await OrgDocument.findById(documentId);

    // Verify Expertise points incremented
    const updatedRadar = await ExpertiseRadar.findOne({ userId: userB._id, topic: 'qa' });
    console.log(`- Expert (User B) radar score for topic 'qa':`, updatedRadar?.score);

  } catch (err: any) {
    console.error('❌ Integration Test Failed:', err);
    process.exit(1);
  } finally {
    console.log('\nCleaning up test records...');
    if (resolvedDoc) await OrgDocument.deleteOne({ _id: resolvedDoc._id });
    if (generalDoc) await OrgDocument.deleteOne({ _id: generalDoc._id });
    if (profileDoc) await OrgDocument.deleteOne({ _id: profileDoc._id });
    if (questionMsg) await Message.deleteOne({ _id: questionMsg._id });
    if (answerMsg) await Message.deleteOne({ _id: answerMsg._id });
    if (conversation) await Conversation.deleteOne({ _id: conversation._id });
    if (userA) {
      await User.deleteOne({ _id: userA._id });
      await ExpertiseRadar.deleteMany({ userId: userA._id });
    }
    if (userB) {
      await User.deleteOne({ _id: userB._id });
      await ExpertiseRadar.deleteMany({ userId: userB._id });
    }
    if (org) await Organization.deleteOne({ _id: org._id });

    await mongoose.disconnect();
    console.log('Disconnected. Bye!');
  }
}

testContinuity();
