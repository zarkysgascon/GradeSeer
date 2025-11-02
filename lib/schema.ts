import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Basic info
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  image: text("image"),

  // For Credentials login
  password: text("password"),

  // For OAuth logins (Google/Facebook)
  provider: varchar("provider", { length: 50 }), // e.g. 'google', 'facebook', 'credentials'
  provider_id: varchar("provider_id", { length: 255 }),

  // Metadata
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
