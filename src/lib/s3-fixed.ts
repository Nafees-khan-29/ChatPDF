import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

// Check if S3 is configured
const isS3Configured = !!(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME
);

let s3Client: S3Client | null = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadToS3(file: File, fileName: string): Promise<{ file_key: string; file_name: string }> {
  const fileKey = `uploads/${Date.now()}-${fileName}`;
  
  if (isS3Configured && s3Client) {
    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      return { file_key: fileKey, file_name: fileName };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  } else {
    // Fallback to local storage for development
    console.log('S3 not configured, storing file locally');
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const localPath = path.join(uploadsDir, `${Date.now()}-${fileName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    
    fs.writeFileSync(localPath, buffer);
    
    return { file_key: localPath, file_name: fileName };
  }
}

export async function getS3Url(fileKey: string): Promise<string> {
  if (isS3Configured && s3Client) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
  } else {
    // For local files, return a local file path or URL
    return `/uploads/${path.basename(fileKey)}`;
  }
}

export async function downloadFromS3(fileKey: string): Promise<string> {
  if (isS3Configured && s3Client) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: fileKey,
      });
      
      const response = await s3Client.send(command);
      const chunks: Uint8Array[] = [];
      
      if (response.Body && 'pipe' in response.Body) {
        // Node.js stream
        const stream = response.Body as NodeJS.ReadableStream;
        for await (const chunk of stream) {
          if (chunk instanceof Buffer) {
            chunks.push(new Uint8Array(chunk));
          } else if (typeof chunk === 'string') {
            chunks.push(new Uint8Array(Buffer.from(chunk)));
          }
        }
      } else if (response.Body) {
        // Web stream or other readable
        const reader = (response.Body as ReadableStream).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      }
      
      const buffer = Buffer.concat(chunks);
      const tempPath = path.join(process.cwd(), 'temp', path.basename(fileKey));
      
      // Ensure temp directory exists
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(tempPath, buffer);
      return tempPath;
    } catch (error) {
      console.error('Error downloading from S3:', error);
      throw error;
    }
  } else {
    // For local files, fileKey is already the local path
    if (fs.existsSync(fileKey)) {
      return fileKey;
    } else {
      throw new Error(`Local file not found: ${fileKey}`);
    }
  }
}
