import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from './pdf-parse-safe';
import prisma from '@/lib/prisma';

// Enhanced Document Processor for AI Document Analyzer
export class DocumentProcessor {
  
  /**
   * Extract text from various document formats
   */
  static async extractText(filePath: string): Promise<string> {
    const fileExtension = path.extname(filePath).toLowerCase();
    
    try {
      switch (fileExtension) {
        case '.pdf':
          return await this.extractPdfText(filePath);
        case '.docx':
          return await this.extractDocxText(filePath);
        case '.doc':
          return await this.extractDocText(filePath);
        case '.txt':
          return await this.extractTxtText(filePath);
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${filePath}:`, error);
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF files
   */
  private static async extractPdfText(filePath: string): Promise<string> {
    const buffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  /**
   * Extract text from DOCX files
   */
  private static async extractDocxText(filePath: string): Promise<string> {
    const buffer = await fs.promises.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Extract text from DOC files (limited support)
   */
  private static async extractDocText(filePath: string): Promise<string> {
    // For .doc files, we'll try to use mammoth as well
    try {
      const buffer = await fs.promises.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error('DOC files require additional processing. Please convert to DOCX format.');
    }
  }

  /**
   * Extract text from TXT files
   */
  private static async extractTxtText(filePath: string): Promise<string> {
    return await fs.promises.readFile(filePath, 'utf-8');
  }

  /**
   * Process document and store chunks with embeddings
   */
  static async processDocument(documentId: number): Promise<void> {
    try {
      // Get document from database
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Extract text from document
      const filePath = path.join(process.cwd(), 'uploads', document.fileKey);
      const extractedText = await this.extractText(filePath);

      // Calculate basic metrics
      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
      const estimatedPageCount = Math.ceil(wordCount / 250); // ~250 words per page

      // Chunk the document
      const chunks = this.chunkText(extractedText);

      // Update document with extracted text and metrics
      await prisma.document.update({
        where: { id: documentId },
        data: {
          extractedText,
          wordCount,
          pageCount: estimatedPageCount,
          status: 'READY',
          processingTime: Date.now() - document.createdAt.getTime(),
        },
      });

      // Store chunks (without embeddings for now - will be added with vector search)
      for (let i = 0; i < chunks.length; i++) {
        await prisma.documentChunk.create({
          data: {
            documentId,
            chunkIndex: i,
            content: chunks[i],
            embedding: JSON.stringify([]), // Placeholder for vector embeddings
            embeddingModel: 'text-embedding-3-small',
            tokens: this.estimateTokens(chunks[i]),
            chunkType: 'TEXT',
          },
        });
      }

      console.log(`✅ Document ${documentId} processed: ${chunks.length} chunks created`);

    } catch (error) {
      console.error(`❌ Error processing document ${documentId}:`, error);
      
      // Update document status to error
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
        },
      });
      
      throw error;
    }
  }

  /**
   * Chunk text into smaller pieces for vector search
   */
  static chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentLength = 0;
    
    for (const sentence of sentences) {
      const sentenceLength = sentence.trim().length;
      
      // If adding this sentence would exceed chunk size, save current chunk
      if (currentLength + sentenceLength > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5)); // Rough overlap
        currentChunk = overlapWords.join(' ') + ' ' + sentence.trim();
        currentLength = currentChunk.length;
      } else {
        currentChunk += sentence.trim() + '. ';
        currentLength += sentenceLength + 2;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get relevant document context for a query
   */
  static async getDocumentContext(query: string, documentId: number, maxChunks = 5): Promise<string> {
    try {
      // For now, get the first few chunks
      // In production, this would use vector similarity search
      const chunks = await prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
        take: maxChunks,
      });

      if (chunks.length === 0) {
        return '';
      }

      // Simple keyword-based relevance (to be replaced with vector search)
      const queryWords = query.toLowerCase().split(/\s+/);
      const rankedChunks = chunks.map((chunk: any) => {
        const content = chunk.content.toLowerCase();
        const relevanceScore = queryWords.reduce((score: number, word: string) => {
          return score + (content.includes(word) ? 1 : 0);
        }, 0);
        
        return { ...chunk, relevanceScore };
      }).sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

      return rankedChunks
        .slice(0, maxChunks)
        .map((chunk: any) => chunk.content)
        .join('\n\n');

    } catch (error) {
      console.error('Error getting document context:', error);
      return '';
    }
  }
}


// Legacy functions for backward compatibility
export const documentProcessor = DocumentProcessor;

// Extract text from DOCX files (legacy function)
async function extractDocxText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    return '';
  }
}

// Simple text processing for uploaded documents (legacy function)
export async function processUploadedDocument(fileName: string): Promise<string> {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, fileName);
    
    console.log('Looking for file:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('File not found, checking uploads directory...');
      
      // List all files in uploads directory for debugging
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log('Files in uploads directory:', files);
        
        // Try to find a file that matches the base name
        const matchingFile = files.find(file => file.includes(fileName.replace(/^\d+-/, '')));
        if (matchingFile) {
          console.log('Found matching file:', matchingFile);
          const actualFilePath = path.join(uploadsDir, matchingFile);
          const fileSize = fs.statSync(actualFilePath).size;
          const lastModified = fs.statSync(actualFilePath).mtime;
          
          // For DOCX files, extract actual text content
          if (matchingFile.endsWith('.docx')) {
            const textContent = await extractDocxText(actualFilePath);
            if (textContent) {
              return `Document: ${matchingFile}
Size: ${Math.round(fileSize / 1024)} KB
Uploaded: ${lastModified.toLocaleString()}

Content:
${textContent}`;
            } else {
              return `✅ DOCX Document Found: ${matchingFile}
📄 File size: ${Math.round(fileSize / 1024)} KB
📅 Uploaded: ${lastModified.toLocaleString()}
📝 Document type: Microsoft Word Document

⚠️ Could not extract text content. To read document content, please ensure the file is not corrupted.`;
            }
          }
          
          return `Document found: ${matchingFile} (${Math.round(fileSize / 1024)} KB)`;
        }
      }
      
      return 'No uploaded document found.';
    }
    
    // File exists, get info and extract content if possible
    const fileSize = fs.statSync(filePath).size;
    const lastModified = fs.statSync(filePath).mtime;
    
    if (fileName.endsWith('.docx')) {
      const textContent = await extractDocxText(filePath);
      if (textContent) {
        return `Document: ${fileName}
Size: ${Math.round(fileSize / 1024)} KB
Last modified: ${lastModified.toLocaleString()}

Content:
${textContent}`;
      }
    }
    
    return `Document found: ${fileName}
File size: ${fileSize} bytes
Last modified: ${lastModified}
Note: To extract actual content, add PDF/DOCX parsing libraries and OpenAI API key.`;
    
  } catch (error) {
    console.error('Error processing document:', error);
    return 'Error accessing document.';
  }
}

// Simple context search in processed text (legacy function)
export function searchInText(text: string, query: string): string {
  if (!text || !query) return '';
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const relevantSentences = sentences.filter(sentence => 
    sentence.toLowerCase().includes(query.toLowerCase())
  );
  
  return relevantSentences.slice(0, 3).join('. ');
}

// Get context from uploaded file (enhanced function)
export async function getDocumentContext(query: string, fileName: string): Promise<string> {
  try {
    // Try to find document in database first
    const document = await prisma.document.findFirst({
      where: {
        OR: [
          { fileName: fileName },
          { fileKey: fileName },
        ],
      },
      include: {
        chunks: {
          take: 5,
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (document && document.chunks.length > 0) {
      // Use enhanced document context with vector search
      return await DocumentProcessor.getDocumentContext(query, document.id);
    } else {
      // Fall back to legacy processing
      const documentText = await processUploadedDocument(fileName);
      const context = searchInText(documentText, query);
      return context || documentText; // Return document info if no specific context found
    }
  } catch (error) {
    console.error('Error getting document context:', error);
    // Fall back to legacy processing
    try {
      const documentText = await processUploadedDocument(fileName);
      const context = searchInText(documentText, query);
      return context || documentText;
    } catch (fallbackError) {
      console.error('Legacy fallback also failed:', fallbackError);
      return '';
    }
  }
}
