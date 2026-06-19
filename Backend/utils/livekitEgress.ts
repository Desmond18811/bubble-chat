import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, extractKeyFromUrl } from './filebase';
import { transcribeAudio } from './whisperService';

const BUCKET = process.env.FILEBASE_BUCKET as string;

/**
 * LiveKit Egress is the room-recording feature that composites a call's audio and
 * drops it in object storage. It's wired but intentionally OFF until we provision
 * the egress worker — flip LIVEKIT_EGRESS_ENABLED=true to turn it on.
 */
export const isEgressEnabled = (): boolean =>
  process.env.LIVEKIT_EGRESS_ENABLED === 'true';

/**
 * Start room composite-audio egress to Filebase/S3.
 * Stub for now: returns null so callers no-op until the worker is provisioned.
 * When enabled, this should call the LiveKit EgressClient and return the
 * destination object key.
 */
export const startRoomAudioEgress = async (_roomId: string): Promise<string | null> => {
  if (!isEgressEnabled()) return null;
  // TODO: wire @livekit/server-sdk EgressClient.startRoomCompositeEgress here,
  // targeting the Filebase bucket, and return the resulting object key.
  console.warn('[Egress] LIVEKIT_EGRESS_ENABLED is on but startRoomAudioEgress is not implemented yet.');
  return null;
};

/** Download a Filebase/S3 object to a temp file and return the local path. */
const downloadToTempFile = async (keyOrUrl: string): Promise<string> => {
  const key = keyOrUrl.startsWith('http') ? extractKeyFromUrl(keyOrUrl) : keyOrUrl;
  const ext = path.extname(key) || '.ogg';
  const tmpPath = path.join(os.tmpdir(), `egress-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3Client.send(command);
  const body = response.Body as Readable;

  await new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(tmpPath);
    body.pipe(out);
    body.on('error', reject);
    out.on('error', reject);
    out.on('finish', () => resolve());
  });

  return tmpPath;
};

/**
 * Transcribe a meeting's egress recording. Downloads the object to a temp file,
 * runs Whisper, and cleans up. Returns '' if no recording or on failure so the
 * caller can fall back to the live speech-recognition transcript.
 */
export const transcribeMeetingRecording = async (recordingKey?: string): Promise<string> => {
  if (!recordingKey) return '';
  let tmpPath: string | null = null;
  try {
    tmpPath = await downloadToTempFile(recordingKey);
    const text = await transcribeAudio(tmpPath);
    return text?.trim() || '';
  } catch (err) {
    console.error('[Egress] Failed to transcribe meeting recording:', err);
    return '';
  } finally {
    if (tmpPath) {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* silent */ }
    }
  }
};
