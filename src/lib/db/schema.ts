import { sqliteTable, text, integer, index, real } from 'drizzle-orm/sqlite-core';

// Users table (linked to Clerk user IDs)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  createdAtIdx: index('user_created_at_idx').on(table.createdAt),
}));

// Documents table
export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileKey: text('file_key').notNull(),
  fileUrl: text('file_url'),
  fileSize: integer('file_size'),
  fileType: text('file_type').notNull(),
  status: text('status').default('processing').notNull(), // processing, ready, error
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
}, (table) => ({
  userIdIdx: index('doc_user_id_idx').on(table.userId),
  statusIdx: index('doc_status_idx').on(table.status),
  createdAtIdx: index('doc_created_at_idx').on(table.createdAt),
}));

// Chats table
export const chats = sqliteTable('chats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New Chat'),
  documentId: integer('document_id').references(() => documents.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
  isActive: text('is_active').default('true').notNull(),
}, (table) => ({
  userIdIdx: index('chat_user_id_idx').on(table.userId),
  documentIdIdx: index('chat_document_id_idx').on(table.documentId),
  createdAtIdx: index('chat_created_at_idx').on(table.createdAt),
  updatedAtIdx: index('chat_updated_at_idx').on(table.updatedAt),
}));

// Messages table
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  createdAt: text('created_at').default("datetime('now')"),
  metadata: text('metadata'), // JSON string for additional data
}, (table) => ({
  chatIdIdx: index('msg_chat_id_idx').on(table.chatId),
  roleIdx: index('msg_role_idx').on(table.role),
  createdAtIdx: index('msg_created_at_idx').on(table.createdAt),
}));

// Document embeddings table for vector search
export const documentEmbeddings = sqliteTable('document_embeddings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: text('embedding').notNull(), // JSON string of vector
  metadata: text('metadata'), // JSON string for chunk metadata
  createdAt: text('created_at').default("datetime('now')"),
}, (table) => ({
  documentIdIdx: index('emb_document_id_idx').on(table.documentId),
  chunkIndexIdx: index('emb_chunk_index_idx').on(table.chunkIndex),
}));

// User preferences table
export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').default('light'), // light, dark, system
  language: text('language').default('en'),
  aiModel: text('ai_model').default('gpt-4'), // Preferred AI model
  settings: text('settings'), // JSON string for additional settings
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
}, (table) => ({
  userIdIdx: index('pref_user_id_idx').on(table.userId),
}));

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;
export type NewDocumentEmbedding = typeof documentEmbeddings.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;