import { downloadFromS3 } from './s3';
import { Document } from './pinecone-new';
import PDFParse from './pdf-parse-safe';

export async function loadS3IntoPinecone(fileKey: string) {
  console.log('Loading S3 file into Pinecone:', fileKey);
  
  try {
    // Download from S3
    const file_name = await downloadFromS3(fileKey);
    
    if (!file_name) {
      throw new Error('Could not download from S3');
    }

    console.log('Loading PDF into memory:', file_name);
    
    // Read the PDF file
    const fs = require('fs');
    const pdfBuffer = fs.readFileSync(file_name);
    
    // Parse PDF
    const data = await PDFParse(pdfBuffer);
    
    // Split text into chunks
    const documents = splitText(data.text, fileKey);
    
    console.log(`Split PDF into ${documents.length} documents`);
    
    return documents;
  } catch (error) {
    console.error('Error in loadS3IntoPinecone:', error);
    throw error;
  }
}

function splitText(text: string, source: string): Document[] {
  // Simple text splitter - split by paragraphs and limit chunk size
  const maxChunkSize = 1000;
  const chunks: Document[] = [];
  
  // Split by double newlines (paragraphs)
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let pageNumber = 1;
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max size, save current chunk
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        pageContent: currentChunk.trim(),
        metadata: {
          source,
          pageNumber,
        },
      });
      
      currentChunk = paragraph;
      pageNumber++;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      pageContent: currentChunk.trim(),
      metadata: {
        source,
        pageNumber,
      },
    });
  }
  
  return chunks;
}
