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
  user_email: text("user_email").notNull(),
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
  topic: text("topic"),
});

/* ------------------ SUBJECT HISTORY TABLE ------------------ */
export const subject_history = pgTable('subject_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject_id: uuid('subject_id').notNull(),
  user_email: text('user_email').notNull(),
  course_name: text('course_name').notNull(),
  target_grade: text('target_grade').notNull(),
  final_grade: text('final_grade').notNull(),
  status: text('status').notNull(), // should be 'reached' or 'missed'
  completed_at: timestamp('completed_at').defaultNow(), // CHANGED: removed timezone
});