import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const maxDuration = 300; // allow longer processing window

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF, DOCX, and TXT files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB. Please split the document and upload in parts.' 
      }, { status: 400 });
    }

    console.log('File upload request:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      userId 
    });

    // Ensure user exists in database
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `${userId}@local`, // placeholder to satisfy unique constraint
        },
      });
    } catch (error) {
      console.error('Error managing user:', error);
    }

    // Generate unique file key
    const fileExtension = path.extname(file.name);
    const fileKey = `documents/${userId}/${uuidv4()}${fileExtension}`;
    
    let fileUrl = '';
    let uploadSuccess = false;

    // Try S3 upload first (we still save locally for processing and not rely on temporary URLs)
    if (BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        
        const uploadCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: buffer,
          ContentType: file.type,
          Metadata: {
            'original-name': file.name,
            'user-id': userId,
            'upload-date': new Date().toISOString(),
          },
        });

        await s3Client.send(uploadCommand);
        
        // Note: We intentionally do not rely on temporary signed URLs for AI processing.
        // We'll save a local copy for immediate extraction/indexing.
        fileUrl = `s3://${BUCKET_NAME}/${fileKey}`;
        uploadSuccess = true;
        
        console.log('File uploaded to S3 successfully:', fileKey);
      } catch (error) {
        console.error('S3 upload failed:', error);
        // Fall back to local storage
      }
    }

    // Always ensure a local copy exists for immediate processing (avoid temp URLs issues)
    if (true) {
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const localFilePath = path.join(uploadsDir, `${Date.now()}-${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(localFilePath, buffer);
        
        // Prefer local path for processing, but retain S3 reference if present
        fileUrl = fileUrl || `/uploads/${path.basename(localFilePath)}`;
        uploadSuccess = true;
        
        console.log('File saved locally:', localFilePath);
      } catch (error) {
        console.error('Local file save failed:', error);
        return NextResponse.json({ 
          error: 'Failed to save file. Please try again.' 
        }, { status: 500 });
      }
    }

    // Save document record to database with Prisma
    let document = null;
    try {
      document = await prisma.document.create({
        data: {
          userId,
          fileName: file.name,
          fileKey: uploadSuccess ? fileKey : path.basename(fileUrl),
          fileUrl,
          fileSize: file.size,
          fileType: path.extname(file.name).toLowerCase(),
          mimeType: file.type,
          status: 'PROCESSING',
          uploadSource: 'web',
        },
      });

      // Create analytics record
      await prisma.documentAnalytics.create({
        data: {
          documentId: document.id,
        },
      });

      console.log('Document record created:', document.id);
    } catch (error) {
      console.error('Error saving document record:', error);
    }

    // Process document for AI analysis (async): chunk + embed + index
    if (uploadSuccess && document) {
      try {
        const { documentProcessor } = await import('@/lib/enhanced-document-processor');
        documentProcessor.processAndIndexDocumentById(document!.id)
          .then((res) => console.log('Indexed document chunks:', res))
          .catch((e) => console.warn('Indexing failed:', e));
      } catch (error) {
        console.error('Error scheduling indexing:', error);
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document?.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: 'PROCESSING',
      },
      fileUrl,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve upload status or list user documents
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        success: false,
        data: []
      }, { status: 401 });
    }

    try {
      const { searchParams } = new URL(req.url);
      const documentId = searchParams.get('documentId');
      const limit = parseInt(searchParams.get('limit') || '10');
      const offset = parseInt(searchParams.get('offset') || '0');

      if (documentId) {
        // Get specific document
        const document = await prisma.document.findFirst({
          where: { 
            id: parseInt(documentId),
            userId 
          },
          include: {
            analytics: true,
            _count: {
              select: {
                chats: true,
                chunks: true,
              },
            },
          },
        });

        if (!document) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json({
          document
        });
      } else {
        // Get all user documents
        const documents = await prisma.document.findMany({
          where: { userId },
          include: {
            analytics: true,
            _count: {
              select: {
                chats: true,
                chunks: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        });

        const total = await prisma.document.count({ 
          where: { userId } 
        });

        return NextResponse.json({
          documents,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        });
      }

    } catch (error) {
      console.error('Error fetching document:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch document status' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      success: false,
      data: []
    }, { status: 500 });
  }
}

// DELETE /api/upload?documentId=123 — removes a document the user owns
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const docIdStr = searchParams.get('documentId');
    if (!docIdStr) return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    const documentId = parseInt(docIdStr);

    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
    if (!doc) return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });

    // Attempt S3 deletion if applicable
    if (doc.fileKey && BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
      try {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const delCmd = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: doc.fileKey });
        await s3Client.send(delCmd);
      } catch (e) {
        console.warn('S3 delete failed (continuing):', e);
      }
    }

    // Attempt local file deletion if it looks like a local upload path
    try {
      if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
        const localPath = path.join(process.cwd(), 'uploads', path.basename(doc.fileUrl));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      }
    } catch (e) {
      console.warn('Local delete failed (continuing):', e);
    }

    // Delete from DB (cascades to chunks, messages via relations)
    await prisma.document.delete({ where: { id: documentId } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete document error:', e);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}