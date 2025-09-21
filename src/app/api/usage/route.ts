import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Count questions/messages (user role) today
    const questionsToday = await prisma.message.count({
      where: {
        role: 'USER',
        createdAt: { gte: startOfDay },
        chat: { is: { userId } },
      },
    });

    // Count documents uploaded today
    const documentsToday = await prisma.document.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
      },
    });

    return NextResponse.json({ 
      questionsToday: questionsToday || 0, 
      documentsToday: documentsToday || 0 
    });
  } catch (e) {
    console.error('Usage GET error:', e);
    return NextResponse.json({ 
      questionsToday: 0, 
      documentsToday: 0,
      error: 'Failed to fetch usage data'
    }, { status: 500 });
  }
}
