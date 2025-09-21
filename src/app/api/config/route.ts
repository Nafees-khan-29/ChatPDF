import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const openai = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10);
    const deepseek = !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 5);
    const anthropic = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 5);

    const clerk = !!(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
    return NextResponse.json({
      models: { openai, deepseek, anthropic },
      auth: { clerk }
    });
  } catch (e) {
    return NextResponse.json({ models: {} });
  }
}
