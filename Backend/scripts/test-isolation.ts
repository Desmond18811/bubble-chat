import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/users';
import { Organization } from '../models/organizations';
import { IngestionJob } from '../models/ingestionJob';
import { OrgDocument } from '../models/orgDocument';
import { ingest, getJobStatus } from '../controllers/brainController';
import { searchBrain } from '../controllers/continuityController';

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

async function testIsolation() {
  console.log('🧪 Starting Cross-Org Isolation Integration Test...');
  await mongoose.connect(mongoURI);

  let orgA: any = null;
  let orgB: any = null;
  let userA: any = null;
  let userB: any = null;
  let jobRecord: any = null;
  let docA: any = null;

  try {
    // 1. Create or Find Org A & B
    orgA = await Organization.findOneAndUpdate(
      { name: 'Alpha Corp Test' },
      { name: 'Alpha Corp Test', owner: new mongoose.Types.ObjectId(), inviteCode: 'alpha-code' },
      { upsert: true, new: true }
    );

    orgB = await Organization.findOneAndUpdate(
      { name: 'Beta Inc Test' },
      { name: 'Beta Inc Test', owner: new mongoose.Types.ObjectId(), inviteCode: 'beta-code' },
      { upsert: true, new: true }
    );

    // 2. Create or Find User A & B
    userA = await User.findOneAndUpdate(
      { email: 'userA@alpha.test' },
      { email: 'userA@alpha.test', username: 'user_a', organization: orgA.name, password: 'password123' },
      { upsert: true, new: true }
    );

    userB = await User.findOneAndUpdate(
      { email: 'userB@beta.test' },
      { email: 'userB@beta.test', username: 'user_b', organization: orgB.name, password: 'password123' },
      { upsert: true, new: true }
    );

    console.log(`Initialized Test Orgs & Users.`);
    console.log(`User A (Org: ${userA.organization}, ID: ${userA._id})`);
    console.log(`User B (Org: ${userB.organization}, ID: ${userB._id})`);

    // 3. User A ingests a private document
    console.log('\n--- Step 1: User A triggering brain ingest... ---');
    const ingestReq: any = {
      user: userA,
      body: {
        sourceType: 'text',
        title: 'Project Phoenix Blueprint',
        content: 'The super secret code for Project Phoenix in Alpha Corp is PHOENIX-SEC-999.',
        department: 'engineering',
        tags: ['phoenix', 'secret'],
      },
    };
    const ingestRes = mockResponse();

    await ingest(ingestReq, ingestRes);

    if (ingestRes.statusCode !== 202) {
      throw new Error(`Ingest request failed with status ${ingestRes.statusCode}: ${JSON.stringify(ingestRes.jsonData)}`);
    }

    const jobId = ingestRes.jsonData.jobId;
    console.log(`✅ Ingestion job initialized: ${jobId}`);

    // Wait for the background process to complete
    console.log('Waiting for background processing job to finish...');
    let jobCompleted = false;
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollReq: any = { user: userA, params: { id: jobId } };
      const pollRes = mockResponse();
      await getJobStatus(pollReq, pollRes);

      if (pollRes.jsonData.job?.status === 'completed') {
        jobCompleted = true;
        jobRecord = pollRes.jsonData.job;
        break;
      } else if (pollRes.jsonData.job?.status === 'failed') {
        throw new Error(`Job processing failed: ${pollRes.jsonData.job.error}`);
      }
    }

    if (!jobCompleted) {
      throw new Error('Timeout waiting for ingestion job completion.');
    }
    console.log('✅ Ingestion Job completed successfully!');

    // Retrieve created doc
    docA = await OrgDocument.findById(jobRecord.resultDocumentId);
    console.log(`Created document ID: ${docA._id}`);

    // 4. Test User A searching for the document (should succeed)
    console.log('\n--- Step 2: User A querying searchBrain... ---');
    const searchReqA: any = {
      user: userA,
      query: { query: 'What is the secret code for Project Phoenix?' },
    };
    const searchResA = mockResponse();
    await searchBrain(searchReqA, searchResA);

    console.log(`User A Search Response Confidence: ${searchResA.jsonData.confidence}`);
    if (searchResA.jsonData.confidence === 'high') {
      console.log('✅ Success: User A retrieved high-confidence matching answer:', searchResA.jsonData.answer);
    } else {
      console.warn('⚠️ User A search returned low confidence. (Pinecone key might be missing/disabled in test env).');
    }

    // 5. Test User B searching for the same query (MUST NOT retrieve User A's private doc)
    console.log('\n--- Step 3: User B (Org B) querying searchBrain (Isolation Check)... ---');
    const searchReqB: any = {
      user: userB,
      query: { query: 'What is the secret code for Project Phoenix?' },
    };
    const searchResB = mockResponse();
    await searchBrain(searchReqB, searchResB);

    console.log(`User B Search Response Confidence: ${searchResB.jsonData.confidence}`);
    
    // Check if User A's secret content leaked
    const responseStr = JSON.stringify(searchResB.jsonData);
    if (responseStr.includes('PHOENIX-SEC-999')) {
      throw new Error('❌ SECURITY FAILURE: User B (Org B) leaked Org A data: ' + responseStr);
    } else {
      console.log('✅ Success: User B search does not show Org A secret data.');
    }

  } catch (err: any) {
    console.error('❌ Integration Test Failed:', err);
    process.exit(1);
  } finally {
    console.log('\nCleaning up test records...');
    if (docA) await OrgDocument.deleteOne({ _id: docA._id });
    if (jobRecord) await IngestionJob.deleteOne({ _id: jobRecord._id });
    if (userA) await User.deleteOne({ _id: userA._id });
    if (userB) await User.deleteOne({ _id: userB._id });
    if (orgA) await Organization.deleteOne({ _id: orgA._id });
    if (orgB) await Organization.deleteOne({ _id: orgB._id });

    await mongoose.disconnect();
    console.log('Disconnected. Bye!');
  }
}

testIsolation();
