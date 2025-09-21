/**
 * Debug script to test API endpoints
 * Run with: node debug-api.js
 */

const BASE_URL = 'http://localhost:3000';

async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    console.log('✅ Health check response:', data);
    return data.database === 'connected';
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testChatsAPI() {
  console.log('🔍 Testing chats API...');
  try {
    const response = await fetch(`${BASE_URL}/api/chats`);
    const data = await response.json();
    console.log('✅ Chats API response:', data);
    return response.ok;
  } catch (error) {
    console.error('❌ Chats API failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  try {
    const { db, isDbConnected } = require('./src/lib/db/index.ts');
    console.log('Database connected:', isDbConnected);
    console.log('Database instance:', db ? 'Available' : 'Not available');
    
    if (db && isDbConnected) {
      // Test a simple query
      const result = await db.execute('SELECT 1 as test');
      console.log('✅ Database query successful:', result);
      return true;
    } else {
      console.log('❌ Database not connected');
      return false;
    }
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting API Debug Tests\n');
  
  const healthOk = await testHealthCheck();
  console.log('');
  
  const dbOk = await testDatabaseConnection();
  console.log('');
  
  const chatsOk = await testChatsAPI();
  console.log('');
  
  console.log('📊 Test Results:');
  console.log(`Health Check: ${healthOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database: ${dbOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Chats API: ${chatsOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!healthOk || !dbOk || !chatsOk) {
    console.log('\n🔧 Troubleshooting Tips:');
    if (!dbOk) {
      console.log('- Check DATABASE_URL in .env.local');
      console.log('- Ensure database file exists (dev.db)');
      console.log('- Run: npm run db:push');
    }
    if (!healthOk) {
      console.log('- Check if server is running: npm run dev');
      console.log('- Check for build errors');
    }
    if (!chatsOk) {
      console.log('- Check authentication setup');
      console.log('- Verify Clerk configuration');
      console.log('- Check database schema');
    }
  } else {
    console.log('\n🎉 All tests passed! Your API is working correctly.');
  }
}

// Run the tests
runTests().catch(console.error);
