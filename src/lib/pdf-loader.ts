import pdf from './pdf-parse-safe';

// Simple Document type to replace LangChain's Document
interface Document {
  pageContent: string;
  metadata: {
    pageNumber: number;
    source: string;
  };
}

export async function loadPDFFromBuffer(buffer: Buffer): Promise<Document[]> {
  try {
    const data = await pdf(buffer);
    
    // Split text into chunks
    const textChunks = splitIntoChunks(data.text, 1000);
    
    return textChunks.map((chunk, index) => ({
      pageContent: chunk,
      metadata: {
        pageNumber: Math.floor(index / 4) + 1, // Rough page estimation
        source: 'pdf',
      },
    }));
  } catch (error) {
    console.error('Error loading PDF:', error);
    throw error;
  }
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  const words = text.split(' ');
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
  }
  
  return chunks;
}

export function extractTextFromOtherFormats(buffer: Buffer, mimeType: string): string {
  // For now, handle text files
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8');
  }
  
  // For DOCX, you might want to add a library like mammoth
  throw new Error(`Unsupported file type: ${mimeType}`);
}
