import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// GET /api/chats - List user's chat sessions
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        success: false,
        data: [],
        total: 0,
        page: 1,
        pages: 0
      }, { status: 401 });
    }

    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const search = searchParams.get('search') || '';
      const offset = (page - 1) * limit;

      // Total count
      const total = await prisma.chat.count({
        where: {
          userId,
          OR: search
            ? [
                { title: { contains: search } },
                { document: { is: { fileName: { contains: search } } } },
              ]
            : undefined,
        },
      });

      const userChats = await prisma.chat.findMany({
        where: {
          userId,
          OR: search
            ? [
                { title: { contains: search } },
                { document: { is: { fileName: { contains: search } } } },
              ]
            : undefined,
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          isArchived: true,
          documentId: true,
          document: {
            select: { fileName: true, fileType: true, status: true },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      });

    
    
    
    const chatsWithCounts = userChats.map((c: any) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      isActive: (!c.isArchived).toString(),
      documentId: c.documentId ?? undefined,
      documentName: c.document?.fileName,
      documentType: c.document?.fileType ?? undefined,
      documentStatus: c.document?.status?.toLowerCase?.() ?? undefined,
      messageCount: c._count.messages,
    }));

      return NextResponse.json({
        chats: chatsWithCounts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });

    } catch (error) {
      console.error('Error fetching chats:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch chat history',
        chats: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
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

// POST /api/chats - Create new chat
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, documentId } = await req.json();

    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: parseInt(documentId), userId },
        select: { id: true },
      });
      if (!doc) {
        return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
      }
    }

    const newChat = await prisma.chat.create({
      data: {
        userId,
        title: title || 'New Chat',
        documentId: documentId ? parseInt(documentId) : null,
      },
    });

    return NextResponse.json({ success: true, chat: newChat });

  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ 
      error: 'Failed to create chat' 
    }, { status: 500 });
  }
}

// DELETE /api/chats - Delete chat
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }
    // Verify chat belongs to user
    const chat = await prisma.chat.findFirst({ where: { id: parseInt(chatId), userId }, select: { id: true } });
    if (!chat) return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });

    await prisma.chat.delete({ where: { id: parseInt(chatId) } });
    return NextResponse.json({ success: true, message: 'Chat deleted successfully' });

  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ 
      error: 'Failed to delete chat' 
    }, { status: 500 });
  }
}