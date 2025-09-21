import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create connection using the same DATABASE_URL
const database_url = process.env.DATABASE_URL;
if (!database_url) {
  console.error('DATABASE_URL is required. Please set it in .env.local');
  console.log('Current env vars:', Object.keys(process.env).filter(k => k.includes('DATA')));
  process.exit(1);
}

console.log('Connecting to database...');
const connection = neon(database_url);
const db = drizzle(connection);

// SQL to create tables directly
const createTablesSQL = `
-- Create chats table
CREATE TABLE IF NOT EXISTS "chats" (
  "id" serial PRIMARY KEY NOT NULL,
  "pdf_name" text NOT NULL,
  "pdf_url" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "user_id" varchar(256) NOT NULL,
  "file_key" text NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "chat_id" integer REFERENCES "chats"("id"),
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "role" text NOT NULL
);
`;

async function createTables() {
  try {
    console.log('Creating tables...');
    await db.execute(sql.raw(createTablesSQL));
    console.log('Tables created successfully!');
    
    // Verify tables exist
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chats', 'messages')
    `);
    
    console.log('Tables found:', result.rows);
    
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createTables();
