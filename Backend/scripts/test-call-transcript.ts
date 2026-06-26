// E2E smoke test for call signaling + meeting transcript lifecycle, run against a
// live server (BASE_URL). Exercises the Phase 5 transcript grace-window fix and the
// userId-targeted call_reject/call_end design, end to end, over real HTTP + sockets.
//
// Usage: BASE_URL=http://localhost:3000 npx ts-node scripts/test-call-transcript.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { io as ioClient, Socket } from 'socket.io-client';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/users';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bubble-chat';
const ORGANIZATION = 'Bubble Space Test Org';
const PASSWORD = 'TestPass123!';
const RUN_TAG = Date.now().toString(36);

let passCount = 0;
let failCount = 0;

function assert(condition: any, message: string) {
  if (condition) {
    passCount++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failCount++;
    console.log(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

function waitForEvent<T = any>(socket: Socket, event: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}"`));
    }, timeoutMs);
    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

async function generateUniqueTag(base: string): Promise<string> {
  let tag: string;
  let exists: boolean;
  const cleanBase = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bubble';
  do {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    tag = `${cleanBase}-${suffix}`;
    exists = !!(await User.findOne({ uniqueTag: tag }));
  } while (exists);
  return tag;
}

async function seedTestUser(label: string) {
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  const email = `call-transcript-${label}-${RUN_TAG}@bubblespace.xyz`;
  const uniqueTag = await generateUniqueTag(`calltest${label}${RUN_TAG}`);
  const user = await User.create({
    full_name: `Call Transcript Test ${label.toUpperCase()}`,
    email,
    password: hashedPassword,
    organization: ORGANIZATION,
    uniqueTag,
    isVerified: true,
    onboardingComplete: true,
    isOnline: false,
    lastSeen: new Date(),
  });
  return { id: String(user._id), email };
}

async function login(email: string): Promise<string> {
  const res = await axios.post(`${BASE_URL}/api/v1/auth/login`, { email, password: PASSWORD });
  return res.data.data.accessToken;
}

function connectSocket(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(BASE_URL, { auth: { token }, transports: ['websocket'] });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (err) => reject(err));
  });
}

async function cleanup(userIds: string[]) {
  if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to MongoDB; testing against ${BASE_URL}\n`);

  const a = await seedTestUser('a');
  const b = await seedTestUser('b');
  let socketA: Socket | undefined;
  let socketB: Socket | undefined;

  try {
    console.log('--- Auth ---');
    const tokenA = await login(a.email);
    const tokenB = await login(b.email);
    assert(!!tokenA && !!tokenB, 'both test users logged in and received access tokens');

    console.log('\n--- Socket connect ---');
    socketA = await connectSocket(tokenA);
    socketB = await connectSocket(tokenB);
    assert(socketA.connected && socketB.connected, 'both sockets authenticated and connected');

    const roomId = `call-test-room-${RUN_TAG}`;

    console.log('\n--- Call signaling ---');
    const incomingCallPromise = waitForEvent(socketB, 'incoming_call');
    socketA.emit('call_offer', { toUserId: b.id, roomId, callerName: 'Call Transcript Test A', type: 'video' });
    const incomingCall: any = await incomingCallPromise;
    assert(incomingCall.roomId === roomId, 'B received incoming_call with matching roomId');

    const callAcceptedPromise = waitForEvent(socketA, 'call_accepted');
    socketB.emit('call_answer', { toUserId: a.id, roomId });
    const callAccepted: any = await callAcceptedPromise;
    assert(callAccepted.roomId === roomId, 'A received call_accepted with matching roomId');

    console.log('\n--- Meeting + transcript ---');
    const createRes = await axios.post(
      `${BASE_URL}/api/v1/meetings`,
      { roomId, title: 'Call Transcript Test Meeting', type: 'video', attendees: [b.id] },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const meetingId = createRes.data.meeting._id;
    assert(createRes.data.meeting.status === 'live', 'meeting created with status "live"');

    const chunks = [
      { speaker: 'Call Transcript Test A', speakerId: a.id, text: 'Hello, can you hear me?', timestamp: Date.now() },
      { speaker: 'Call Transcript Test B', speakerId: b.id, text: 'Yes, loud and clear.', timestamp: Date.now() },
    ];
    for (const chunk of chunks) {
      await axios.post(
        `${BASE_URL}/api/v1/meetings/${meetingId}/transcript`,
        chunk,
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
    }

    const midGetRes = await axios.get(`${BASE_URL}/api/v1/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      midGetRes.data.meeting.transcriptChunks?.length === chunks.length,
      `transcriptChunks length matches posted chunks (${chunks.length})`
    );

    console.log('\n--- Call end + meeting end ---');
    const callEndedPromise = waitForEvent(socketB, 'call_ended');
    socketA.emit('call_end', { toUserId: b.id, roomId });
    const callEnded: any = await callEndedPromise;
    assert(callEnded.roomId === roomId, 'B received call_ended after A hung up');

    // Post one trailing chunk right at teardown to exercise the transcript grace window.
    await axios.post(
      `${BASE_URL}/api/v1/meetings/${meetingId}/transcript`,
      { speaker: 'Call Transcript Test A', speakerId: a.id, text: 'One last thing before we go.', timestamp: Date.now() },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const meetingEndedPromise = waitForEvent(socketB, 'meeting_ended');
    const endRes = await axios.post(
      `${BASE_URL}/api/v1/meetings/${meetingId}/end`,
      {},
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(endRes.data.meeting.status === 'ended', 'endMeeting response shows status "ended"');

    const meetingEnded: any = await meetingEndedPromise;
    assert(!!meetingEnded, 'B received meeting_ended broadcast');

    const finalGetRes = await axios.get(`${BASE_URL}/api/v1/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const finalMeeting = finalGetRes.data.meeting;
    assert(finalMeeting.status === 'ended', 'GET meeting shows status "ended"');
    assert(!!finalMeeting.endedAt, 'GET meeting has endedAt populated');
    assert(
      finalMeeting.transcriptChunks?.length === chunks.length + 1,
      'trailing transcript chunk posted during teardown was accepted (grace window)'
    );
    assert(!!finalMeeting.transcriptRaw, 'GET meeting has transcriptRaw compiled');

    if (process.env.DEEPSEEK_API_KEY) {
      console.log('\n--- Action items (DEEPSEEK_API_KEY set) ---');
      let actionItemsRes;
      for (let i = 0; i < 5; i++) {
        actionItemsRes = await axios.get(`${BASE_URL}/api/v1/meetings/${meetingId}/action-items`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        if (actionItemsRes.data.summary) break;
        await new Promise((r) => setTimeout(r, 3000));
      }
      assert(!!actionItemsRes?.data.summary, 'AI summary generated for the meeting');
    } else {
      console.log('\n--- Action items skipped (DEEPSEEK_API_KEY not set) ---');
    }
  } finally {
    socketA?.disconnect();
    socketB?.disconnect();
    await cleanup([a.id, b.id]);
    await mongoose.disconnect();
  }

  console.log(`\n${passCount} passed, ${failCount} failed`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\nTest script crashed:', err);
  process.exit(1);
});
