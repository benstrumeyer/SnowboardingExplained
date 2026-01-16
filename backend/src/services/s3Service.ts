import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'snowboarding-explained-frontend';

export async function uploadToS3(filePath: string, key: string): Promise<string> {
  try {
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const mimeType = getMimeType(fileName);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: mimeType,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;
    return url;
  } catch (err: any) {
    console.error('[S3] Upload error:', err);
    throw new Error(`Failed to upload to S3: ${err.message}`);
  }
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
