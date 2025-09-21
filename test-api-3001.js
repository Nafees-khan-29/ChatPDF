console.log('Testing ChatPDF API endpoints...');

async function testAPI() {
  try {
    // Test 1: Check if server is running
    console.log('1. Testing server health...');
    const healthResponse = await fetch('http://localhost:3001/');
    console.log('Home page status:', healthResponse.status);
    
    // Test 2: Test API endpoint (this might return 401 but it should be reachable)
    console.log('2. Testing API reachability...');
    const apiResponse = await fetch('http://localhost:3001/api/upload');
    console.log('API upload status:', apiResponse.status);
    
    if (apiResponse.status === 401) {
      console.log('✅ 401 is expected for unauthenticated requests - API is working');
    } else if (apiResponse.status === 200) {
      console.log('✅ API is working and authenticated');
    } else {
      console.log('❌ Unexpected status:', apiResponse.status);
    }
    
    console.log('✅ Tests completed. Server is running on port 3001.');
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAPI();