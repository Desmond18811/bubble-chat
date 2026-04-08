import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const BUCKET = process.env.FILEBASE_BUCKET as string;

export const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.FILEBASE_ACCESS_KEY as string,
    secretAccessKey: process.env.FILEBASE_SECRET_KEY as string,
  },
  forcePathStyle: true, // Required for Filebase/S3-compatible
});

/**
 * Extract the storage KEY from a previously stored Filebase URL.
 * Handles both virtual-hosted style (bubblle-19.s3.filebase.com/KEY)
 * and path-style (s3.filebase.com/bubblle-19/KEY).
 */
export const extractKeyFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    // Remove leading slash
    if (path.startsWith('/')) path = path.slice(1);
    // Strip bucket prefix for path-style URLs: "bubblle-19/messages/..." -> "messages/..."
    if (path.startsWith(`${BUCKET}/`)) {
      path = path.slice(BUCKET.length + 1);
    }
    return path;
  } catch {
    // If URL parsing fails, assume it's already a key
    return url;
  }
};

/**
 * Upload a file stream or buffer to Filebase (private bucket — no ACL).
 * IMPORTANT: We store the KEY (not the URL) for later presigning.
 * Returns { url (legacy compat), key } — always use `key` for new code.
 */
export const uploadToFilebase = async (
  fileData: Buffer | fs.ReadStream,
  fileKey: string,
  contentType: string
): Promise<{ url: string; key: string }> => {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET,
        Key: fileKey,
        Body: fileData,
        ContentType: contentType,
        // NOTE: No ACL — bucket is private. All access via presigned URLs.
      },
    });

    await upload.done();

    // Build a legacy URL for backward-compat with old DB records.
    // Use path-style so extractKeyFromUrl can always recover the key.
    const url = `https://s3.filebase.com/${BUCKET}/${fileKey}`;
    return { url, key: fileKey };
  } catch (error) {
    console.error('[Filebase] Upload Error:', error);
    throw error;
  }
};

/**
 * Generate a short-lived (1 hour) presigned URL for accessing a private Filebase object.
 * Accepts either a raw storage KEY or a full Filebase URL (both styles).
 */
export const getSignedMediaUrl = async (keyOrUrl: string): Promise<string> => {
  const key = keyOrUrl.startsWith('http') ? extractKeyFromUrl(keyOrUrl) : keyOrUrl;
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};
