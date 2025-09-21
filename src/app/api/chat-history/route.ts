import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// Helper function to format time ago
function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else {
    const months = Math.floor(diffInDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
}

// GET /api/chat-history - Get all chats for the current user
export async function GET(req: NextRequest) {
  console.log('📋 GET /api/chat-history - Fetching chat history');
  
  const { userId } = await auth();
  
  if (!userId) {
    console.log('❌ Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔍 Fetching chats for user:', userId);
    
    // Get all chats for the user with their latest message
    const userChats = await prisma.chat.findMany({
      where: { 
        userId,
        isArchived: false,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        document: {
          select: {
            id: true,
            fileName: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    console.log(`✅ Found ${userChats.length} chats for user`);

    // Format the chats for the frontend
    const formattedChats = userChats.map(chat => {
      const lastMessage = chat.messages[0];
      return {
        id: chat.id,
        title: chat.title,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          timestamp: lastMessage.createdAt,
          timeAgo: formatTimeAgo(lastMessage.createdAt),
        } : null,
        document: chat.document,
        messageCount: chat._count.messages,
        updatedAt: chat.updatedAt,
        timeAgo: formatTimeAgo(chat.updatedAt),
      };
    });

    return NextResponse.json({ 
      chats: formattedChats,
      total: formattedChats.length 
    });

  } catch (error) {
    console.error('❌ Error fetching chat history:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch chat history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/chat-history - Create a new chat
export async function POST(req: NextRequest) {
  console.log('📝 POST /api/chat-history - Creating new chat');
  
  const { userId } = await auth();
  
  if (!userId) {
    console.log('❌ Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, documentId } = await req.json();
    
    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: '', // Will be updated from Clerk webhook
      },
    });

    // Create new chat
    const newChat = await prisma.chat.create({
      data: {
        userId,
        title: title || 'New Chat',
        documentId: documentId ? parseInt(documentId) : null,
      },
      include: {
        document: {
          select: {
            id: true,
            fileName: true,
          },
        },
      },
    });

    console.log('✅ Created new chat:', newChat.id);
    
    return NextResponse.json({ 
      chat: {
        id: newChat.id,
        title: newChat.title,
        document: newChat.document,
        messageCount: 0,
        updatedAt: newChat.updatedAt,
        timeAgo: 'Just now',
      }
    });

  } catch (error) {
    console.error('❌ Error creating chat:', error);
    return NextResponse.json({ 
      error: 'Failed to create chat',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/chat-history - Delete a specific chat
export async function DELETE(req: NextRequest) {
  console.log('🗑️ DELETE /api/chat-history - Deleting chat');
  
  const { userId } = await auth();
  
  if (!userId) {
    console.log('❌ Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ 
        error: 'Chat ID is required' 
      }, { status: 400 });
    }

    console.log('🔍 Attempting to delete chat:', chatId);

    // Verify ownership and delete
    const chat = await prisma.chat.findFirst({
      where: {
        id: parseInt(chatId),
        userId,
      },
    });

    if (!chat) {
      console.log('❌ Chat not found or unauthorized');
      return NextResponse.json({ 
        error: 'Chat not found' 
      }, { status: 404 });
    }

    // Delete the chat (messages will be cascade deleted)
    await prisma.chat.delete({
      where: { id: parseInt(chatId) },
    });

    console.log('✅ Chat deleted successfully');
    
    return NextResponse.json({ 
      message: 'Chat deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Error deleting chat:', error);
    return NextResponse.json({ 
      error: 'Failed to delete chat',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}