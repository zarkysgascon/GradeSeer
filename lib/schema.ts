import { pgTable, varchar, integer, boolean, text, uuid, timestamp } from "drizzle-orm/pg-core";

/* ------------------ USERS TABLE ------------------ */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  password: text("password"),
  provider: text("provider"),
  provider_id: text("provider_id"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

/* ------------------ SUBJECTS TABLE ------------------ */
export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  is_major: boolean("is_major").notNull().default(false),
  user_email: text("user_email").notNull(), // Removed reference for now
  target_grade: text("target_grade"),
  color: varchar("color", { length: 25 }).default("#3B82F6"),
});

/* ------------------ COMPONENTS TABLE ------------------ */
export const components = pgTable("components", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  percentage: text("percentage").notNull(),
  priority: integer("priority").notNull(),
  subject_id: uuid("subject_id").notNull().references(() => subjects.id),
});

/* ------------------ ITEMS TABLE ------------------ */
export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  component_id: uuid("component_id").notNull().references(() => components.id),
  name: text("name").notNull(),
  score: integer("score"),
  max: integer("max"),
  date: varchar("date", { length: 50 }),
  target: integer("target"),
  topic: text("topic"), // NOW EXISTS
});
