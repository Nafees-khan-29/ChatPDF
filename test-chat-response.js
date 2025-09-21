// Test chat API to see the actual response being returned
const fetch = require('node-fetch');

async function testChatAPI() {
  try {
    console.log('🧪 Testing chat API response...');
    
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is the name of the person in this resume?',
        chatId: 'test-chat-' + Date.now(),
        documentId: '58' // Using the latest document
      })
    });
    
    const text = await response.text();
    console.log('📝 Raw response text:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('📋 Parsed JSON response:');
      console.log('Response:', json.response);
      console.log('ChatId:', json.chatId);
      console.log('Metadata:', json.metadata);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testChatAPI();