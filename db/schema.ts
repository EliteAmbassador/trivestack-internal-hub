import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("team_member"),
  team: text("team").notNull().default("Product"),
  jobTitle: text("job_title").notNull().default("Team Member"),
  status: text("status").notNull().default("active"),
  createdAt: createdAt(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  ownerId: text("owner_id").references(() => users.id),
  team: text("team").notNull().default("Product"),
  status: text("status").notNull().default("active"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: createdAt(),
});

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  reportType: text("report_type").notNull(),
  projectId: text("project_id").notNull().references(() => projects.id),
  periodLabel: text("period_label").notNull(),
  completedWork: text("completed_work").notNull(),
  workInProgress: text("work_in_progress").notNull().default(""),
  plannedWork: text("planned_work").notNull().default(""),
  blockers: text("blockers").notNull().default(""),
  supportNeeded: text("support_needed").notNull().default(""),
  decisionsNeeded: text("decisions_needed").notNull().default(""),
  documentationLinks: text("documentation_links").notNull().default(""),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("in_progress"),
  additionalNotes: text("additional_notes").notNull().default(""),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => reports.id),
  userId: text("user_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: createdAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details").notNull().default(""),
  createdAt: createdAt(),
});

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  role: text("role").notNull().default("team_member"),
  team: text("team").notNull().default("Product"),
  jobTitle: text("job_title").notNull().default("Team Member"),
  invitedBy: text("invited_by").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedBy: text("accepted_by").references(() => users.id),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const workspaceSettings = pgTable("workspace_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
