// Simple test to verify API functionality
const http = require('http');

// Test the basic AI functionality
async function testAPI() {
  const postData = JSON.stringify({
    message: "Hello, test message",
    chatId: null
  });

  const options = {
    hostname: 'localhost',
    port: 3003,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run test
console.log('Testing API...');
testAPI().catch(console.error);
