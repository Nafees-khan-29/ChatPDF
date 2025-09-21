// Test the new OpenAI API key integration
const fetch = require('node-fetch');

async function testOpenAIIntegration() {
  try {
    console.log('🧪 Testing chat API with new OpenAI key...');
    
    const chatResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is the name of the person in this resume?',
        chatId: 'test-chat-' + Date.now(),
        documentId: '58'
      })
    });
    
    if (!chatResponse.ok) {
      throw new Error(`HTTP ${chatResponse.status}: ${chatResponse.statusText}`);
    }
    
    const chatData = await chatResponse.json();
    console.log('\n📝 Chat Response:');
    console.log('Status:', chatResponse.status);
    console.log('Response:', chatData.response);
    console.log('Model:', chatData.metadata?.model);
    console.log('Confidence:', chatData.metadata?.confidence);
    console.log('Processing Time:', chatData.metadata?.processingTime + 'ms');
    
    // Check if we're getting proper AI responses vs fallback
    if (chatData.metadata?.model && chatData.metadata.model !== 'fallback') {
      console.log('✅ SUCCESS: OpenAI API integration working!');
    } else {
      console.log('⚠️  Using fallback response, checking if it improved...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOpenAIIntegration();