import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Enhanced database configuration with SQLite for immediate functionality
const databaseUrl = process.env.DATABASE_URL;

console.log('🔍 Database configuration check:', databaseUrl ? 'Present' : 'Missing');

let db: any = null;
let isDbConnected = false;

try {
  if (databaseUrl === 'file:./dev.db') {
    // Use SQLite for local development
    const dbPath = path.join(process.cwd(), 'dev.db');
    console.log('📁 Using SQLite database at:', dbPath);
    
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    
    db = drizzle(sqlite, { schema });
    isDbConnected = true;
    
    console.log('✅ SQLite database connected successfully');
    
    // Create tables if they don't exist
    initializeTables();
    
  } else if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    // Use PostgreSQL for production
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle: drizzleNeon } = await import('drizzle-orm/neon-http');
    
    const sql = neon(databaseUrl);
    db = drizzleNeon(sql, { schema });
    isDbConnected = true;
    
    console.log('✅ PostgreSQL database connected successfully');
    
  } else {
    console.warn('⚠️  No valid DATABASE_URL found. Chat history will be disabled.');
    console.warn('� To enable chat history:');
    console.warn('   Option 1: Keep DATABASE_URL="file:./dev.db" for SQLite (works immediately)');
    console.warn('   Option 2: Set up Neon PostgreSQL:');
    console.warn('     1. Go to https://neon.tech');
    console.warn('     2. Create a free account and project');
    console.warn('     3. Copy connection string to DATABASE_URL');
    
    db = null;
    isDbConnected = false;
  }
} catch (error) {
  console.error('❌ Database connection failed:', error);
  db = null;
  isDbConnected = false;
}

// Initialize tables for SQLite
function initializeTables() {
  try {
    if (db && isDbConnected) {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          first_name TEXT,
          last_name TEXT,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create documents table
      db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_key TEXT NOT NULL,
          file_url TEXT,
          file_size INTEGER,
          file_type TEXT NOT NULL,
          status TEXT DEFAULT 'processing' NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create chats table
      db.run(`
        CREATE TABLE IF NOT EXISTS chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT 'New Chat',
          document_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active TEXT DEFAULT 'true' NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
        )
      `);
      
      // Create messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        )
      `);
      
      // Create document embeddings table
      db.run(`
        CREATE TABLE IF NOT EXISTS document_embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          embedding TEXT NOT NULL,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        )
      `);
      
      // Create user preferences table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          theme TEXT DEFAULT 'light',
          language TEXT DEFAULT 'en',
          ai_model TEXT DEFAULT 'gpt-4',
          settings TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_chats_document_id ON chats(document_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON document_embeddings(document_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_index ON document_embeddings(chunk_index)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON user_preferences(user_id)`);
      
      console.log('✅ Database tables initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
  }
}

export { db, isDbConnected };