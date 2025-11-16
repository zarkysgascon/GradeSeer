import { pgTable, serial, varchar, integer, boolean, text, uuid, timestamp } from "drizzle-orm/pg-core";

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
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  is_major: boolean("is_major").notNull().default(false),
  user_email: text("user_email").notNull(),
  target_grade: text("target_grade"), // nullable
  color: varchar("color", { length: 25 }).default("#3B82F6"), // now supports HEX or HSL
});

/* ------------------ COMPONENTS TABLE ------------------ */
export const components = pgTable("components", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  percentage: text("percentage").notNull(), // numeric as string
  priority: integer("priority").notNull(),
  subject_id: uuid("subject_id").notNull().references(() => subjects.id),
});

/* ------------------ ITEMS TABLE ------------------ */
export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(), // CHANGED: from serial to uuid
  component_id: uuid("component_id").notNull().references(() => components.id), // CHANGED: added notNull
  name: text("name").notNull(), // CHANGED: from varchar to text
  score: integer("score"),
  max: integer("max"),
  date: varchar("date"),
  target: integer("target"),
});