import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import AdvancedAISystem from '@/lib/advanced-ai-system';
import { EnhancedDocumentProcessor } from '@/lib/enhanced-document-processor';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { message, chatId, documentId, model } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('Chat request:', { message, chatId, documentId, userId });

    // Classify the question and get relevant document context
    const questionClassification = await AdvancedAISystem.classifyQuestion(message);
    console.log('Question classified as:', questionClassification);

    let documentContext = '';
    let retrievalChunks = 5; // Default chunk count
    let similarityThreshold = 0.3;

    // Enhanced parameters for project-specific queries
    if (questionClassification.type === 'extraction' || 
        message.toLowerCase().includes('project') || 
        message.toLowerCase().includes('experience') ||
        message.toLowerCase().includes('work') ||
        message.toLowerCase().includes('portfolio')) {
      retrievalChunks = 18; // Increased for comprehensive project extraction
      similarityThreshold = 0.15; // Lower threshold for broader context
      console.log('Using enhanced retrieval for project query:', { retrievalChunks, similarityThreshold });
    }

    // Get document context if documentId is provided
    if (documentId) {
      try {
        // Try hybrid search first, fallback to simple text search if embeddings fail
        let retrieval;
        try {
          retrieval = await EnhancedDocumentProcessor.hybridSimilaritySearch(
            message,
            parseInt(documentId),
            {
              maxResults: retrievalChunks,
              semanticWeight: 0.7,
              keywordWeight: 0.3,
              similarityThreshold: similarityThreshold
            }
          );
        } catch (embeddingError) {
          console.log('Embedding search failed, using simple text search fallback');
          // Simple fallback: get chunks and search by keyword
          const chunks = await prisma.documentChunk.findMany({
            where: { documentId: parseInt(documentId) },
            orderBy: { chunkIndex: 'asc' },
          });
          
          const keywords = message.toLowerCase().split(' ').filter((word: string) => word.length > 2);
          const scoredChunks = chunks.map(chunk => {
            const content = chunk.content.toLowerCase();
            const score = keywords.reduce((acc: number, keyword: string) => {
              const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
              return acc + matches;
            }, 0);
            return { ...chunk, score };
          }).filter(chunk => chunk.score > 0)
           .sort((a, b) => b.score - a.score)
           .slice(0, retrievalChunks);
          
          retrieval = {
            chunks: scoredChunks.map(chunk => ({
              content: chunk.content,
              similarity: chunk.score / keywords.length,
              chunkIndex: chunk.chunkIndex
            }))
          };
        }
        
        if (retrieval.chunks && retrieval.chunks.length > 0) {
          documentContext = retrieval.chunks.map((chunk: any) => chunk.content).join('\n\n');
          console.log(`Retrieved ${retrieval.chunks.length} chunks with enhanced context`);
        } else {
          console.log('No relevant context found, trying basic document text extraction');
          // Final fallback - get first few chunks regardless of relevance
          const basicChunks = await prisma.documentChunk.findMany({
            where: { documentId: parseInt(documentId) },
            orderBy: { chunkIndex: 'asc' },
            take: Math.min(retrievalChunks, 5)
          });
          
          if (basicChunks.length > 0) {
            documentContext = basicChunks.map(chunk => chunk.content).join('\n\n');
            console.log(`Using basic fallback: ${basicChunks.length} chunks`);
          }
        }
      } catch (error) {
        console.error('Error retrieving document context:', error);
        // Even more basic fallback - try to get document text directly
        try {
          const document = await prisma.document.findUnique({
            where: { id: parseInt(documentId) },
            select: { extractedText: true }
          });
          if (document?.extractedText) {
            documentContext = document.extractedText.substring(0, 5000); // Limit to 5000 chars
            console.log('Using direct document text as fallback');
          }
        } catch (docError) {
          console.error('Even document text fallback failed:', docError);
        }
      }
    }

    // Get or create chat
    let chat;
    if (chatId) {
      chat = await prisma.chat.findUnique({
        where: { id: parseInt(chatId) }
      });
      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }
    } else {
      // Create new chat
      chat = await prisma.chat.create({
        data: {
          userId,
          title: message.substring(0, 100),
          documentId: documentId ? parseInt(documentId) : null,
        }
      });
    }

    // Get chat history for context
    const chatHistory = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    // Store user message
    await prisma.message.create({
      data: {
        chatId: chat.id,
        content: message,
        role: 'USER',
      }
    });

    // Generate AI response using enhanced system
    const aiResult = await AdvancedAISystem.generateEnhancedResponse(
      message,
      documentContext,
      {
        documentId: documentId ? parseInt(documentId) : undefined,
        userId,
        preferredModel: model || 'claude-3-5-sonnet-20241022',
        maxTokens: 4000,
        temperature: 0.05
      }
    );

    const aiResponse = aiResult.answer;

    // Store AI response
    await prisma.message.create({
      data: {
        chatId: chat.id,
        content: aiResponse,
        role: 'ASSISTANT',
      }
    });

    // Update chat timestamp
    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      response: aiResponse,
      chatId: chat.id,
      metadata: {
        questionType: questionClassification.type,
        contextLength: documentContext.length,
        chunkCount: retrievalChunks,
        model: model || 'claude-3-5-sonnet-20241022',
        confidence: aiResult.confidence,
        processingTime: aiResult.processingTime
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}