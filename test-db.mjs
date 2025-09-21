import { db } from './src/lib/db/index.js';
import { sql } from 'drizzle-orm';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // List all tables
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Tables in database:', tables.rows);
    
    // Check if chats table exists
    const chatsTable = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'chats'
    `);
    
    console.log('Chats table columns:', chatsTable.rows);
    
  } catch (error) {
    console.error('Database test error:', error);
  }
}

testConnection();
