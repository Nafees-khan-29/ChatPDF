import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const chatId = parseInt(params.id as string);
    const { title } = await req.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
    }

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId }, select: { id: true } });
    if (!chat) return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });

    const updated = await prisma.chat.update({ where: { id: chatId }, data: { title } });
    return NextResponse.json({ success: true, chat: updated });
  } catch (e) {
    console.error('Update chat title error:', e);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}
