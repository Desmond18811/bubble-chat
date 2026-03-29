import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import dotenv from 'dotenv';
dotenv.config();

const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.FILEBASE_ACCESS_KEY as string,
    secretAccessKey: process.env.FILEBASE_SECRET_KEY as string,
  },
  forcePathStyle: true, // Required for Filebase/S3-compatible
});

export const uploadToFilebase = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<any> => {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.FILEBASE_BUCKET as string,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
      },
    });

    const result = await upload.done();
    
    // Filebase usually returns location as https://{bucket}.s3.filebase.com/{key}
    // Result.Location should contain this.
    return result;
  } catch (error) {
    console.error('Filebase Upload Error:', error);
    throw error;
  }
};
