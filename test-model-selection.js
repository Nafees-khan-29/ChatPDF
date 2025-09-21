// Simple test to check the getBestAvailableModel function
const path = require('path');

// Mock the environment variables with placeholder values
process.env.OPENAI_API_KEY = 'OPENAI_API_KEY';
process.env.GEMINI_API_KEY = 'GEMINI_API_KEY';

async function testModelSelection() {
  try {
    // Import the Advanced AI System
    const AdvancedAISystemModule = require('./src/lib/advanced-ai-system.ts');
    const AdvancedAISystem = AdvancedAISystemModule.AdvancedAISystem || AdvancedAISystemModule.default;
    
    console.log('🧪 Testing getBestAvailableModel...');
    
    // Initialize the system
    await AdvancedAISystem.initialize();
    
    // Get the best available model
    const bestModel = AdvancedAISystem.getBestAvailableModel();
    console.log('✅ Best available model:', bestModel);
    
    // Check API key validations
    console.log('OpenAI available:', AdvancedAISystem.hasValidOpenAI);
    console.log('Gemini available:', AdvancedAISystem.hasValidGemini);
    console.log('Anthropic available:', AdvancedAISystem.hasValidAnthropic);
    
  } catch (error) {
    console.error('❌ Error testing model selection:', error.message);
  }
}

testModelSelection();