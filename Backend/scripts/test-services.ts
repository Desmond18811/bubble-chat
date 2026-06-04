import dotenv from 'dotenv';
dotenv.config();
import { RoomServiceClient } from 'livekit-server-sdk';
import OpenAI from 'openai';

async function testLiveKit() {
  console.log('🤖 Testing LiveKit Connection...');
  const url = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY || process.env.VITE_LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET || process.env.VITE_LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    console.error('❌ LiveKit credentials not found in env!');
    return false;
  }

  // LiveKit Node SDK expects HTTP/HTTPS endpoint for room service
  const httpUrl = url.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');

  try {
    console.log(`Connecting to RoomServiceClient at ${httpUrl}...`);
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const rooms = await roomService.listRooms();
    console.log('✅ LiveKit Connection SUCCESS!');
    console.log(`Rooms listed: ${rooms.length}`);
    return true;
  } catch (err: any) {
    console.error('❌ LiveKit Connection FAILED:', err.message || err);
    return false;
  }
}

async function testOpenAI() {
  console.log('\n🤖 Testing OpenAI (Whisper) Configuration...');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OpenAI API key not found in env!');
    return false;
  }

  try {
    const openai = new OpenAI({ apiKey });
    // List models to verify key validity
    const models = await openai.models.list();
    console.log('✅ OpenAI API Key VALID!');
    console.log(`Successfully fetched ${models.data.length} models.`);
    return true;
  } catch (err: any) {
    console.error('❌ OpenAI API Key INVALID:', err.message || err);
    return false;
  }
}

async function run() {
  console.log('=== Bubble Chat Service Diagnostic Tests ===\n');
  const lkOk = await testLiveKit();
  const aiOk = await testOpenAI();
  console.log('\n=== Diagnostic Run Finished ===');
}

run();
