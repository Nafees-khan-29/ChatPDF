import { pgTable, serial, text, timestamp, varchar, foreignKey, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userSystemEnum = pgEnum("user_system_enum", ['user', 'assistant'])


export const chats = pgTable("chats", {
	id: serial().primaryKey().notNull(),
	title: text("title").notNull(), // Chat conversation title
	pdfName: text("pdf_name"), // Make optional since we support any document
	pdfUrl: text("pdf_url"), // Make optional
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(), // Track last activity
	userId: varchar("user_id", { length: 255 }).notNull(),
	fileKey: text("file_key"), // Make optional for text-only chats
	isActive: text("is_active").default('true').notNull(), // Track active chats
});

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	chatId: integer("chat_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	role: userSystemEnum().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "messages_chat_id_chats_id_fk"
		}),
]);
