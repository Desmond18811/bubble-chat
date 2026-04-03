import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import dotenv from 'dotenv';
dotenv.config();

const BUCKET = process.env.FILEBASE_BUCKET as string;

const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.FILEBASE_ACCESS_KEY as string,
    secretAccessKey: process.env.FILEBASE_SECRET_KEY as string,
  },
  forcePathStyle: true, // Required for Filebase/S3-compatible
});

/**
 * Build the high-quality CDN public URL for a Filebase file key
 */
export const getFilebasePublicUrl = (key: string): string => {
  return `https://${BUCKET}.s3.filebase.com/${key}`;
};

/**
 * Upload a file buffer to Filebase with public-read access.
 * Returns { url, key } — always use `url` for storage/retrieval.
 */
export const uploadToFilebase = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string; key: string }> => {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read', // Ensure files are publicly accessible
      },
    });

    await upload.done();

    // Always build the CDN URL ourselves — result.Location may use path-style URL
    const url = getFilebasePublicUrl(fileName);
    return { url, key: fileName };
  } catch (error) {
    console.error('Filebase Upload Error:', error);
    throw error;
  }
};
