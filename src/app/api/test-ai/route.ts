import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import AdvancedAISystem from '@/lib/advanced-ai-system';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test API keys and system health
    const health = AdvancedAISystem.getSystemHealth();
    
    // Test a simple OpenAI call
    let openaiTest = 'not tested';
    try {
      const testResponse = await AdvancedAISystem.generateEnhancedResponse(
        "Say 'test successful' in exactly 2 words",
        "",
        { maxTokens: 10, temperature: 0 }
      );
      openaiTest = testResponse.model === 'fallback' ? 'quota exceeded' : 'working';
    } catch (error: any) {
      openaiTest = error.message?.includes('quota') ? 'quota exceeded' : 'error';
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      systemHealth: health,
      apiTests: {
        openai: openaiTest,
        hasOpenAIKey: !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY),
        hasAnthropicKey: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here'),
        hasDeepSeekKey: !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here')
      },
      troubleshooting: {
        message: openaiTest === 'quota exceeded' 
          ? 'OpenAI API quota exceeded. Please add billing to your OpenAI account or configure alternative APIs.'
          : 'API system operational',
        actions: [
          'Check OpenAI billing at https://platform.openai.com/account/billing',
          'Add valid Anthropic API key for backup',
          'Verify environment variables are properly set'
        ]
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'System test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}