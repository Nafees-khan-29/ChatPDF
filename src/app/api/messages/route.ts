import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// GET /api/messages?chatId=123
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const chatIdStr = searchParams.get('chatId');
    if (!chatIdStr) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }
    const chatId = parseInt(chatIdStr);

    // Verify ownership
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId }, select: { id: true, documentId: true, title: true } });
    if (!chat) return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });

    const msgs = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true, sources: true }
    });

    return NextResponse.json({
      chat: { id: chat.id, title: chat.title, documentId: chat.documentId },
      messages: msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        sources: m.sources ?? undefined,
      }))
    });
  } catch (e) {
    console.error('Fetch messages error:', e);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
