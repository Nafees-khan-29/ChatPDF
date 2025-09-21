import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import AdvancedAISystem from '@/lib/advanced-ai-system';

export async function GET(req: NextRequest) {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      version: '1.0.0',
      aiSystem: {} as any
    };

    // Test database connection via Prisma
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.database = 'connected';
    } catch (error) {
      health.database = 'error';
      console.error('Database health check failed:', error);
    }

    // Test AI system health
    try {
      health.aiSystem = AdvancedAISystem.getSystemHealth();
    } catch (error) {
      health.aiSystem = { status: 'error', error: 'Failed to get AI system status' };
      console.error('AI system health check failed:', error);
    }

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
