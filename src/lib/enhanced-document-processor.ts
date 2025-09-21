import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from './pdf-parse-safe';
import prisma from './prisma';
import { getEmbedding } from './embeddings';
import { OpenAI } from 'openai';
import { performance } from 'perf_hooks';

// Lazy load natural to avoid webpack issues
let natural: any = null;
const loadNatural = () => {
  if (!natural) {
    try {
      natural = require('natural');
    } catch (error) {
      console.warn('Natural library not available, using fallback tokenization');
    }
  }
  return natural;
};

// Enhanced document processing with ML-powered text analysis
export class EnhancedDocumentProcessor {
  private tokenizer: any;
  private stemmer: any;
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  constructor() {
    const nat = loadNatural();
    if (nat) {
      this.tokenizer = new nat.WordTokenizer();
      this.stemmer = nat.PorterStemmer;
    } else {
      // Fallback tokenizer
      this.tokenizer = {
        tokenize: (text: string) => text.toLowerCase().split(/\s+/).filter(word => word.length > 0)
      };
      this.stemmer = {
        stem: (word: string) => word.toLowerCase()
      };
    }
  }

  // Extract text from DOCX files with better error handling
  async extractDocxText(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    } catch (error) {
      console.error('Error extracting DOCX text:', error);
      return '';
    }
  }

  // Extract text from PDF files (basic implementation)
  async extractPdfText(filePath: string): Promise<string> {
    try {
      const data = await pdfParse(fs.readFileSync(filePath));
      return (data.text || '').trim();
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return '';
    }
  }

  // Extract text from TXT files
  async extractTxtText(filePath: string): Promise<string> {
    try {
      return fs.readFileSync(filePath, 'utf-8').trim();
    } catch (error) {
      console.error('Error extracting TXT text:', error);
      return '';
    }
  }

  // Main document processing function
  async processDocument(fileName: string): Promise<{
    content: string;
    metadata: {
      fileName: string;
      fileSize: number;
      lastModified: Date;
      wordCount: number;
      extractedAt: Date;
    };
    analysis: {
      keywords: string[];
      entities: string[];
      summary: string;
    };
  }> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, fileName);
      
      console.log('Processing document:', filePath);
      
      if (!fs.existsSync(filePath)) {
        // Try to find matching file
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          const matchingFile = files.find(file => 
            file.includes(fileName.replace(/^\d+-/, '')) || 
            file.includes(fileName)
          );
          
          if (matchingFile) {
            const actualFilePath = path.join(uploadsDir, matchingFile);
            return await this.processDocumentFile(actualFilePath, matchingFile);
          }
        }
        
        throw new Error(`File not found: ${fileName}`);
      }
      
      return await this.processDocumentFile(filePath, fileName);
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  // Chunk long text into overlapping segments (~1000 chars, 200 overlap)
  private chunkText(text: string, chunkSize = 1000, overlap = 200) {
    const chunks: { content: string; index: number; start: number; end: number }[] = [];
    let start = 0;
    let index = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const content = text.slice(start, end);
      chunks.push({ content, index, start, end });
      if (end === text.length) break;
      start = end - overlap;
      index += 1;
    }
    return chunks;
  }

  // Process and index a document by Prisma Document id
  async processAndIndexDocumentById(documentId: number): Promise<{ chunks: number } | null> {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return null;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const localFile = doc.fileKey && fs.existsSync(path.join(uploadsDir, doc.fileKey))
      ? path.join(uploadsDir, doc.fileKey)
      : fs.readdirSync(uploadsDir).find(f => f.endsWith(doc.fileName))
        ? path.join(uploadsDir, fs.readdirSync(uploadsDir).find(f => f.endsWith(doc.fileName)) as string)
        : null;

    let content = '';
    if (localFile) {
      if (localFile.endsWith('.docx')) content = await this.extractDocxText(localFile);
      else if (localFile.endsWith('.pdf')) content = await this.extractPdfText(localFile);
      else if (localFile.endsWith('.txt')) content = await this.extractTxtText(localFile);
    } else if (doc.extractedText) {
      content = doc.extractedText;
    }

    if (!content) return null;

    // Chunk content
    const chunks = this.chunkText(content, 2000, 300); // char-based fallback

    // Remove old chunks
    await prisma.documentChunk.deleteMany({ where: { documentId } });

    // Embed and store
    let count = 0;
    for (const ch of chunks) {
      const emb = await getEmbedding(ch.content);
      await prisma.documentChunk.create({
        data: {
          documentId,
          chunkIndex: ch.index,
          content: ch.content,
          embedding: JSON.stringify(emb),
          embeddingModel: 'Xenova/all-MiniLM-L6-v2',
          tokens: ch.content.length,
        },
      });
      count++;
    }

    await prisma.document.update({ where: { id: documentId }, data: { status: 'READY', summary: this.generateSummary(content), wordCount: this.tokenizer.tokenize(content)?.length ?? undefined } });
    return { chunks: count };
  }

  // Process individual document file
  private async processDocumentFile(filePath: string, fileName: string) {
    const fileSize = fs.statSync(filePath).size;
    const lastModified = fs.statSync(filePath).mtime;
    
    let content = '';
    
    if (fileName.endsWith('.docx')) {
      content = await this.extractDocxText(filePath);
    } else if (fileName.endsWith('.pdf')) {
      content = await this.extractPdfText(filePath);
    } else if (fileName.endsWith('.txt')) {
      content = await this.extractTxtText(filePath);
    }
    
    if (!content) {
      throw new Error('Could not extract content from document');
    }
    
    // Analyze the content
    const analysis = this.analyzeContent(content);
    
    return {
      content,
      metadata: {
        fileName,
        fileSize,
        lastModified,
        wordCount: this.tokenizer.tokenize(content)?.length || 0,
        extractedAt: new Date(),
      },
      analysis,
    };
  }

  // Analyze document content using ML techniques
  private analyzeContent(content: string) {
    const tokens = this.tokenizer.tokenize(content) || [];
    const words = tokens.map((token: string) => token.toLowerCase());
    
    // Extract keywords using TF-IDF
    const keywords = this.extractKeywords(words);
    
    // Extract entities (names, places, etc.)
    const entities = this.extractEntities(content);
    
    // Generate summary
    const summary = this.generateSummary(content);
    
    return {
      keywords,
      entities,
      summary,
    };
  }

  // Extract keywords using frequency analysis
  private extractKeywords(words: string[]): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
    
    const wordFreq: { [key: string]: number } = {};
    
    words.forEach(word => {
      if (word.length > 2 && !stopWords.has(word)) {
        const stemmed = this.stemmer.stem(word);
        wordFreq[stemmed] = (wordFreq[stemmed] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  // Extract entities (simple implementation)
  private extractEntities(content: string): string[] {
    const entities: string[] = [];
    
    // Look for common patterns
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    
    const names = content.match(namePattern) || [];
    const emails = content.match(emailPattern) || [];
    const phones = content.match(phonePattern) || [];
    
    entities.push(...names, ...emails, ...phones);
    
    return [...new Set(entities)]; // Remove duplicates
  }

  // Generate summary using extractive summarization
  private generateSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length <= 3) {
      return content;
    }
    
    // Simple extractive summarization - take first few sentences
    return sentences.slice(0, 3).join('. ').trim() + '.';
  }

  // Search for relevant content in document
  searchInDocument(content: string, query: string): string {
    if (!content || !query) return '';
    
    const queryWords = this.tokenizer.tokenize(query.toLowerCase()) || [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Score sentences based on query word matches
    const scoredSentences = sentences.map(sentence => {
      const sentenceWords = this.tokenizer.tokenize(sentence.toLowerCase()) || [];
      const score = queryWords.reduce((acc: number, queryWord: string) => {
        return acc + sentenceWords.filter((word: string) => 
          word.includes(queryWord) || queryWord.includes(word)
        ).length;
      }, 0);
      
      return { sentence, score };
    });
    
    // Return top 3 most relevant sentences
    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.sentence)
      .join('. ')
      .trim();
  }

  // Get document context for AI
  async getDocumentContext(query: string, fileName: string): Promise<string> {
    try {
      const document = await this.processDocument(fileName);
      const relevantContent = this.searchInDocument(document.content, query);
      
      return `Document: ${document.metadata.fileName}
File Size: ${Math.round(document.metadata.fileSize / 1024)} KB
Word Count: ${document.metadata.wordCount}
Uploaded: ${document.metadata.lastModified.toLocaleString()}

Relevant Content:
${relevantContent || document.analysis.summary}

Full Document Content:
${document.content}`;
    } catch (error) {
      console.error('Error getting document context:', error);
      return `Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // ==================== ADVANCED ML/DL CAPABILITIES ====================

  /**
   * Generate advanced embeddings using multiple OpenAI models
   */
  static async generateAdvancedEmbeddings(text: string): Promise<{
    embedding_large: number[];
    embedding_small: number[];
    confidence: number;
  }> {
    try {
      const results = await Promise.allSettled([
        // OpenAI text-embedding-3-large (highest quality)
        this.openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: text.substring(0, 8000), // Limit input size
          dimensions: 1536,
        }),
        // OpenAI text-embedding-3-small (faster, still good quality)
        this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000),
          dimensions: 1536,
        }),
      ]);

      const embeddings: any = {};
      let confidence = 0;

      if (results[0].status === 'fulfilled') {
        embeddings.embedding_large = results[0].value.data[0].embedding;
        confidence += 0.7;
        console.log('✅ Generated large embedding:', embeddings.embedding_large.length, 'dimensions');
      } else {
        console.warn('❌ Large embedding failed:', results[0].reason);
        embeddings.embedding_large = [];
      }

      if (results[1].status === 'fulfilled') {
        embeddings.embedding_small = results[1].value.data[0].embedding;
        confidence += 0.3;
        console.log('✅ Generated small embedding:', embeddings.embedding_small.length, 'dimensions');
      } else {
        console.warn('❌ Small embedding failed:', results[1].reason);
        embeddings.embedding_small = [];
      }

      return {
        embedding_large: embeddings.embedding_large || [],
        embedding_small: embeddings.embedding_small || [],
        confidence
      };
    } catch (error) {
      console.error('Error generating advanced embeddings:', error);
      return {
        embedding_large: [],
        embedding_small: [],
        confidence: 0
      };
    }
  }

  /**
   * ML-powered semantic chunking with contextual boundaries
   */
  async semanticChunking(text: string, options = {
    chunkSize: 1000,
    overlap: 200,
    useSemanticBoundaries: true,
    preserveStructure: true
  }): Promise<Array<{
    content: string;
    metadata: {
      chunkIndex: number;
      semanticScore: number;
      startChar: number;
      endChar: number;
      type: 'semantic' | 'structural' | 'paragraph';
    };
    embedding?: number[];
  }>> {
    
    const chunks = [];
    let currentPosition = 0;

    if (options.useSemanticBoundaries) {
      // Split by semantic units (paragraphs, sections)
      const paragraphs = text.split(/\n\s*\n+/).filter(p => p.trim().length > 0);
      
      let currentChunk = '';
      let chunkStartPos = 0;
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        const paragraphLength = paragraph.length;
        
        // Check if adding this paragraph exceeds chunk size
        if (currentChunk.length + paragraphLength > options.chunkSize && currentChunk.length > 0) {
          // Finalize current chunk
          const semanticScore = await this.calculateSemanticCoherence(currentChunk);
          const chunkEndPos = chunkStartPos + currentChunk.length;
          
          chunks.push({
            content: currentChunk.trim(),
            metadata: {
              chunkIndex: chunks.length,
              semanticScore,
              startChar: chunkStartPos,
              endChar: chunkEndPos,
              type: 'semantic' as const,
            }
          });
          
          // Start new chunk with overlap
          const sentences = currentChunk.split(/[.!?]+/).slice(-2);
          const overlapText = sentences.join('. ').trim();
          currentChunk = overlapText + (overlapText ? '. ' : '') + paragraph;
          chunkStartPos = chunkEndPos - overlapText.length;
        } else {
          // Add paragraph to current chunk
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          if (i === 0) chunkStartPos = currentPosition;
        }
        
        currentPosition += paragraphLength + 2; // +2 for \n\n
      }
      
      // Add final chunk
      if (currentChunk.trim().length > 0) {
        const semanticScore = await this.calculateSemanticCoherence(currentChunk);
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            chunkIndex: chunks.length,
            semanticScore,
            startChar: chunkStartPos,
            endChar: currentPosition,
            type: 'semantic' as const,
          }
        });
      }
    } else {
      // Fallback to sentence-based chunking
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      let currentChunk = '';
      let chunkStartPos = 0;
      let sentencePos = 0;
      
      for (const sentence of sentences) {
        const sentenceText = sentence.trim() + '. ';
        
        if (currentChunk.length + sentenceText.length > options.chunkSize && currentChunk.length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: {
              chunkIndex: chunks.length,
              semanticScore: 0.5, // Default for non-semantic chunking
              startChar: chunkStartPos,
              endChar: sentencePos,
              type: 'structural' as const,
            }
          });
          
          // Overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(options.overlap / 5));
          currentChunk = overlapWords.join(' ') + ' ' + sentenceText;
          chunkStartPos = sentencePos - (overlapWords.join(' ').length);
        } else {
          currentChunk += sentenceText;
          if (chunks.length === 0 && currentChunk === sentenceText) {
            chunkStartPos = sentencePos;
          }
        }
        
        sentencePos += sentenceText.length;
      }
      
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            chunkIndex: chunks.length,
            semanticScore: 0.5,
            startChar: chunkStartPos,
            endChar: sentencePos,
            type: 'structural' as const,
          }
        });
      }
    }
    
    // Filter out very short chunks
    return chunks.filter(chunk => chunk.content.length > 50);
  }

  /**
   * Calculate semantic coherence using linguistic features
   */
  private async calculateSemanticCoherence(text: string): Promise<number> {
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length < 2) return 0.5;
      
      // Analyze lexical cohesion
      const words = this.tokenizer.tokenize(text.toLowerCase()) || [];
      const uniqueWords = new Set(words);
      const lexicalDiversity = uniqueWords.size / words.length;
      
      // Analyze sentence length consistency
      const lengths = sentences.map(s => s.trim().split(/\s+/).length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length;
      const lengthConsistency = Math.max(0, 1 - (variance / (avgLength * avgLength)));
      
      // Check for transitional phrases
      const transitions = ['however', 'therefore', 'furthermore', 'moreover', 'consequently', 'meanwhile', 'additionally'];
      const transitionCount = transitions.reduce((count, phrase) => {
        return count + (text.toLowerCase().includes(phrase) ? 1 : 0);
      }, 0);
      const transitionScore = Math.min(1, transitionCount / sentences.length);
      
      // Combine scores
      const coherenceScore = (
        (1 - lexicalDiversity) * 0.4 + // Lower diversity = more cohesive
        lengthConsistency * 0.4 +
        transitionScore * 0.2
      );
      
      return Math.max(0, Math.min(1, coherenceScore));
      
    } catch (error) {
      console.warn('Error calculating semantic coherence:', error);
      return 0.5;
    }
  }

  /**
   * Enhanced similarity search with hybrid scoring
   */
  static async hybridSimilaritySearch(
    query: string, 
    documentId: number, 
    options = {
      maxResults: 5,
      semanticWeight: 0.7,
      keywordWeight: 0.3,
      similarityThreshold: 0.3
    }
  ): Promise<{
    chunks: Array<{
      content: string;
      similarity: number;
      chunkIndex: number;
      metadata: any;
    }>;
    confidence: number;
  }> {
    try {
      // Generate query embedding
      const queryEmbeddings = await this.generateAdvancedEmbeddings(query);
      
      if (queryEmbeddings.confidence === 0) {
        console.warn('Failed to generate query embeddings, falling back to keyword search');
        return await this.keywordOnlySearch(query, documentId, options);
      }

      // Get all document chunks
      const chunks = await prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
      });

      if (chunks.length === 0) {
        return { chunks: [], confidence: 0 };
      }

      // Score each chunk
      const scoredChunks = await Promise.all(chunks.map(async (chunk: any) => {
        const chunkEmbedding = JSON.parse(chunk.embedding || '[]');
        
        // Calculate semantic similarity
        let semanticScore = 0;
        if (chunkEmbedding.length > 0 && queryEmbeddings.embedding_large.length > 0) {
          semanticScore = this.cosineSimilarity(queryEmbeddings.embedding_large, chunkEmbedding);
        }
        
        // Calculate keyword similarity
        const keywordScore = this.calculateKeywordSimilarity(query, chunk.content);
        
        // Combine scores
        const hybridScore = (semanticScore * options.semanticWeight) + (keywordScore * options.keywordWeight);
        
        return {
          content: chunk.content,
          similarity: hybridScore,
          semanticScore,
          keywordScore,
          chunkIndex: chunk.chunkIndex,
          metadata: {
            chunkType: chunk.chunkType,
            tokens: chunk.tokens,
            embeddingModel: chunk.embeddingModel,
          }
        };
      }));

      // Filter and sort results
      const relevantChunks = scoredChunks
        .filter(chunk => chunk.similarity >= options.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options.maxResults);

      const confidence = relevantChunks.length > 0 ? 
        relevantChunks.reduce((acc, chunk) => acc + chunk.similarity, 0) / relevantChunks.length : 0;

      console.log(`🔍 Hybrid search found ${relevantChunks.length} relevant chunks (confidence: ${confidence.toFixed(3)})`);
      
      return {
        chunks: relevantChunks,
        confidence
      };

    } catch (error) {
      console.error('Error in hybrid similarity search:', error);
      return { chunks: [], confidence: 0 };
    }
  }

  /**
   * Fallback keyword-only search
   */
  private static async keywordOnlySearch(query: string, documentId: number, options: any) {
    try {
      const chunks = await prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
      });

      const scoredChunks = chunks.map((chunk: any) => {
        const keywordScore = this.calculateKeywordSimilarity(query, chunk.content);
        
        return {
          content: chunk.content,
          similarity: keywordScore,
          chunkIndex: chunk.chunkIndex,
          metadata: {
            chunkType: chunk.chunkType,
            tokens: chunk.tokens,
            embeddingModel: chunk.embeddingModel,
          }
        };
      });

      const relevantChunks = scoredChunks
        .filter((chunk: any) => chunk.similarity >= 0.1)
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, options.maxResults);

      return {
        chunks: relevantChunks,
        confidence: 0.3 // Lower confidence for keyword-only
      };
    } catch (error) {
      console.error('Error in keyword search:', error);
      return { chunks: [], confidence: 0 };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate keyword-based similarity with TF-IDF weighting
   */
  private static calculateKeywordSimilarity(query: string, text: string): number {
    const queryWords = query.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2 && !this.isStopWord(w));
    
    const textWords = text.toLowerCase().split(/\s+/);
    
    if (queryWords.length === 0) return 0;
    
    let score = 0;
    queryWords.forEach(queryWord => {
      const termFreq = textWords.filter(word => word.includes(queryWord)).length;
      if (termFreq > 0) {
        // Simple TF weighting
        const tf = termFreq / textWords.length;
        score += tf;
      }
    });
    
    return Math.min(1, score / queryWords.length);
  }

  /**
   * Simple stop word detection
   */
  private static isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    return stopWords.includes(word.toLowerCase());
  }
}

// Export singleton instance
export const documentProcessor = new EnhancedDocumentProcessor();
