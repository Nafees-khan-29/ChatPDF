// Test the new OpenAI API key integration
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

console.log('🔑 Checking updated OpenAI API key...');
console.log('API Key present:', !!process.env.OPENAI_API_KEY);
console.log('API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

// Test basic OpenAI initialization
async function testOpenAI() {
  try {
    const OpenAI = require('openai').OpenAI;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized successfully');
    
    // Test a simple completion
    try {
      console.log('🧪 Testing API connection...');
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "Hello, API is working!"' }],
        max_tokens: 20
      });
      console.log('✅ OpenAI API working:', response.choices[0].message.content);
      console.log('✅ SUCCESS: New OpenAI API key is functional!');
    } catch (error) {
      console.log('❌ OpenAI API error:', error.message);
      
      if (error.message.includes('quota')) {
        console.log('💡 This appears to be a quota/billing issue. The key may need billing setup.');
      } else if (error.message.includes('401')) {
        console.log('💡 This appears to be an authentication issue. Please verify the key is correct.');
      }
    }
    
  } catch (error) {
    console.error('❌ OpenAI initialization failed:', error.message);
  }
}

testOpenAI();