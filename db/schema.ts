import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("team_member"),
  team: text("team").notNull().default("Product"),
  jobTitle: text("job_title").notNull().default("Team Member"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  ownerId: text("owner_id").references(() => users.id),
  team: text("team").notNull().default("Product"),
  status: text("status").notNull().default("active"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reports = sqliteTable("reports", {
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
  submittedAt: text("submitted_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => reports.id),
  userId: text("user_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  role: text("role").notNull().default("team_member"),
  team: text("team").notNull().default("Product"),
  jobTitle: text("job_title").notNull().default("Team Member"),
  invitedBy: text("invited_by").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  acceptedAt: text("accepted_at"),
  acceptedBy: text("accepted_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workspaceSettings = sqliteTable("workspace_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
