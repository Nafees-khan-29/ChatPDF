const fs = require('fs');
const path = require('path');

async function testCompleteSystem() {
  try {
    console.log('🧪 Testing complete AI system...');
    
    // First, let's test a simple question to see if the API is working
    const testResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello, can you tell me what AI models are available?',
        documentId: null
      })
    });

    if (!testResponse.ok) {
      console.error('❌ Test failed - Response not OK:', testResponse.status, testResponse.statusText);
      const errorText = await testResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const result = await testResponse.json();
    console.log('✅ System test successful!');
    console.log('Response:', result.response?.substring(0, 200) + '...');
    console.log('Model used:', result.metadata?.model);
    console.log('Processing time:', result.metadata?.processingTime);
    
  } catch (error) {
    console.error('❌ System test failed:', error.message);
  }
}

// Run the test
testCompleteSystem();