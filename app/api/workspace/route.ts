import { getWorkspaceDb } from "@/db/workspace-db";

export const runtime = "nodejs";

const INITIAL_SUPER_ADMIN = {
  displayName: process.env.INITIAL_SUPER_ADMIN_NAME ?? "Victor Ogunbode",
  email: (process.env.INITIAL_SUPER_ADMIN_EMAIL ?? "victor@trivestack.com").trim().toLowerCase(),
};
const ALLOWED_EMAIL_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS ?? "trivestack.com")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);
const ROLES = ["team_member", "team_lead", "stakeholder", "super_admin"] as const;
const REPORT_TYPES = ["daily", "weekly", "monthly"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;
const REPORT_STATUSES = ["not_started", "in_progress", "completed", "blocked", "delayed", "on_hold", "needs_review"] as const;
const PROJECT_STATUSES = ["active", "paused", "completed"] as const;
const DEMO_EMAILS = ["ceo@trivestack.com", "cto@trivestack.com", "raymond@trivestack.com", "nobert@trivestack.com"];
const DEMO_REPORT_COMPLETED_WORK = [
  "Reviewed bulk catalogue upload and inventory intelligence requirements.",
  "Completed payment reconciliation flow and merchant wallet review.",
  "Prepared social commerce ordering flow notes for engineering review.",
  "Aligned delivery-partner fulfilment requirements with operations.",
  "Mapped merchant onboarding requirements and risk checks.",
];
const SESSION_COOKIE = "trivestack_session";
const SESSION_DAYS = 30;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_ITERATIONS = 210000;
let schemaReady: Promise<void> | null = null;
const db = getWorkspaceDb();

type DbUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  team: string;
  job_title: string;
  status: string;
};

type ReportRow = Record<string, unknown> & {
  user_id: string;
  report_type: string;
  submitted_at: string | null;
};

type InviteRow = {
  id: string;
  token: string;
  email: string;
  role: string;
  team: string;
  job_title: string;
  status: string;
  expires_at: string;
};

type PlannedWorkItem = {
  text: string;
  priority: string;
};

type SettingsRow = {
  key: string;
  value: string;
};

type SubmissionStats = {
  submittedUsers: number;
  totalUsers: number;
  pendingUsers: number;
};

function isAllowedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`));
}

function isOneOf<const T extends readonly string[]>(
  options: T,
  value: string | undefined,
): value is T[number] {
  return !!value && (options as readonly string[]).includes(value);
}

function clean(payload: Record<string, unknown>, key: string, fallback = "") {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : fallback;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function validHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validReportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
}

function reportDateToUtcDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function periodLabelFor(reportType: string, reportDate: string) {
  const date = reportDateToUtcDate(reportDate);
  if (reportType === "monthly") {
    return new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  if (reportType === "weekly") {
    const start = new Date(date);
    start.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const format = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    return `${format.format(start)} - ${format.format(end)}`;
  }
  return new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parsePlannedWorkItems(payload: Record<string, unknown>) {
  const raw = clean(payload, "plannedWorkItems");
  if (!raw) return [] as PlannedWorkItem[];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw jsonError("Planned work items are invalid");
  }

  if (!Array.isArray(parsed)) throw jsonError("Planned work items are invalid");

  const items = parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const text = typeof record.text === "string" ? record.text.trim() : "";
      const priority = typeof record.priority === "string" ? record.priority.trim() : "medium";
      return text ? { text, priority } : null;
    })
    .filter((item): item is PlannedWorkItem => !!item);

  if (items.length > 25) throw jsonError("Add 25 planned items or fewer");
  if (items.some((item) => !isOneOf(PRIORITIES, item.priority))) {
    throw jsonError("Each planned item needs a valid priority");
  }

  return items;
}

function plannedWorkSummary(items: PlannedWorkItem[]) {
  return items
    .map((item) => `- ${item.text} (${titleCase(item.priority)})`)
    .join("\n");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function derivePasswordHash(password: string, saltHex: string, iterations: number) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

async function hashPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltHex = bytesToHex(salt);
  const hashHex = await derivePasswordHash(password, saltHex, PASSWORD_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${saltHex}$${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [algorithm, iterationValue, saltHex, hashHex] = storedHash.split("$");
  const iterations = Number.parseInt(iterationValue, 10);
  if (algorithm !== "pbkdf2_sha256" || !iterations || !saltHex || !hashHex) return false;
  const candidate = await derivePasswordHash(password, saltHex, iterations);
  return constantTimeEqual(candidate, hashHex);
}

function validateNewPassword(password: string, confirmPassword: string) {
  if (password.length < PASSWORD_MIN_LENGTH) return "Password must be at least 8 characters";
  if (password !== confirmPassword) return "Passwords do not match";
  return null;
}

function longDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function monthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function weekRange(date = new Date()) {
  const start = new Date(date);
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${longDate(start)} - ${longDate(end)}`;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function expiryDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function sessionCookie(token: string, request: Request) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function expiredSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function inviteUrl(request: Request, token: string) {
  return new URL(`/invite/${token}`, request.url).toString();
}

function ensureWorkspaceSchema() {
  schemaReady ??= db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY NOT NULL, full_name text NOT NULL, email text NOT NULL, password_hash text, role text DEFAULT 'team_member' NOT NULL, team text DEFAULT 'Product' NOT NULL, job_title text DEFAULT 'Team Member' NOT NULL, status text DEFAULT 'active' NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)"),
    db.prepare("CREATE TABLE IF NOT EXISTS projects (id text PRIMARY KEY NOT NULL, name text NOT NULL, description text DEFAULT '' NOT NULL, owner_id text, team text DEFAULT 'Product' NOT NULL, status text DEFAULT 'active' NOT NULL, start_date text, end_date text, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (owner_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS projects_name_unique ON projects (name)"),
    db.prepare("CREATE TABLE IF NOT EXISTS reports (id text PRIMARY KEY NOT NULL, user_id text NOT NULL, report_type text NOT NULL, project_id text NOT NULL, report_date text, period_label text NOT NULL, completed_work text NOT NULL, work_in_progress text DEFAULT '' NOT NULL, planned_work text DEFAULT '' NOT NULL, planned_work_items text, blockers text DEFAULT '' NOT NULL, support_needed text DEFAULT '' NOT NULL, decisions_needed text DEFAULT '' NOT NULL, documentation_links text DEFAULT '' NOT NULL, priority text DEFAULT 'medium' NOT NULL, status text DEFAULT 'in_progress' NOT NULL, additional_notes text DEFAULT '' NOT NULL, submitted_at timestamptz, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action, FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE no action ON DELETE no action)"),
    db.prepare("ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_date text"),
    db.prepare("ALTER TABLE reports ADD COLUMN IF NOT EXISTS planned_work_items text"),
    db.prepare("CREATE TABLE IF NOT EXISTS comments (id text PRIMARY KEY NOT NULL, report_id text NOT NULL, user_id text NOT NULL, comment text NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (report_id) REFERENCES reports(id) ON UPDATE no action ON DELETE no action, FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_logs (id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY NOT NULL, user_id text NOT NULL, action text NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL, details text DEFAULT '' NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action)"),
    db.prepare("CREATE TABLE IF NOT EXISTS invitations (id text PRIMARY KEY NOT NULL, token text NOT NULL, email text NOT NULL, role text DEFAULT 'team_member' NOT NULL, team text DEFAULT 'Product' NOT NULL, job_title text DEFAULT 'Team Member' NOT NULL, invited_by text NOT NULL, status text DEFAULT 'pending' NOT NULL, expires_at timestamptz NOT NULL, accepted_at timestamptz, accepted_by text, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (invited_by) REFERENCES users(id) ON UPDATE no action ON DELETE no action, FOREIGN KEY (accepted_by) REFERENCES users(id) ON UPDATE no action ON DELETE no action)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_unique ON invitations (token)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_invitations_email_status ON invitations (email, status)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY NOT NULL, user_id text NOT NULL, token text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_unique ON sessions (token)"),
    db.prepare("CREATE TABLE IF NOT EXISTS workspace_settings (key text PRIMARY KEY NOT NULL, value text NOT NULL, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
  ]).then(() => undefined);
  return schemaReady;
}

async function seedWorkspace(email: string, displayName: string, passwordHash?: string) {
  const count = await db.prepare("SELECT COUNT(*)::int AS total FROM users").first<{ total: number }>();
  if ((count?.total ?? 0) > 0) {
    await cleanupDemoData(email);
    await seedDefaultSettings();
    return;
  }

  const ownerId = crypto.randomUUID();
  const projectRows = [
    [crypto.randomUUID(), "Trivestack Backoffice", "Merchant operations and commerce administration.", ownerId, "Product", "active"],
    [crypto.randomUUID(), "Trivestack Storefront", "Customer-facing web commerce experience.", ownerId, "Engineering", "active"],
    [crypto.randomUUID(), "Trivestack Social Commerce", "Social selling and structured conversational orders.", ownerId, "Engineering", "active"],
    [crypto.randomUUID(), "WhatsApp Shopping Assistant", "AI-assisted product discovery and checkout on WhatsApp.", ownerId, "Engineering", "active"],
    [crypto.randomUUID(), "Offline Sales Recorder", "Reliable offline transaction and inventory recording.", ownerId, "Product", "paused"],
    [crypto.randomUUID(), "POS Payment Bridge", "Unified payment-terminal bridge for POS workflows.", ownerId, "Engineering", "active"],
    [crypto.randomUUID(), "Fulfilment and Delivery", "Fulfilment model and delivery partner integration.", ownerId, "Product", "active"],
  ];

  await db.batch([
    db.prepare("INSERT INTO users (id, full_name, email, password_hash, role, team, job_title, status) VALUES (?, ?, ?, ?, 'super_admin', 'Product', 'Product Manager', 'active')").bind(ownerId, displayName || "Victor Ogunbode", email.toLowerCase(), passwordHash ?? null),
    ...projectRows.map((row) => db.prepare("INSERT INTO projects (id, name, description, owner_id, team, status) VALUES (?, ?, ?, ?, ?, ?)").bind(...row)),
  ]);
  await seedDefaultSettings();
}

async function seedDefaultSettings() {
  await db.batch([
    db.prepare("INSERT INTO workspace_settings (key, value) VALUES ('dailyReminderTime', '5:00 PM') ON CONFLICT (key) DO NOTHING"),
    db.prepare("INSERT INTO workspace_settings (key, value) VALUES ('weeklyDueDay', 'friday') ON CONFLICT (key) DO NOTHING"),
    db.prepare("INSERT INTO workspace_settings (key, value) VALUES ('monthlyDue', 'Last working day') ON CONFLICT (key) DO NOTHING"),
    db.prepare("INSERT INTO workspace_settings (key, value) VALUES ('inAppReminders', 'true') ON CONFLICT (key) DO NOTHING"),
    db.prepare("INSERT INTO workspace_settings (key, value) VALUES ('emailReminders', 'true') ON CONFLICT (key) DO NOTHING"),
    db.prepare("INSERT INTO workspace_settings (key, value) VALUES ('lateSubmissionAlerts', 'true') ON CONFLICT (key) DO NOTHING"),
  ]);
}

async function cleanupDemoData(currentEmail: string) {
  const currentUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(currentEmail.toLowerCase()).first<{ id: string }>();
  if (!currentUser) return;

  const demoUsers = await db.prepare(`SELECT id FROM users WHERE email IN (${DEMO_EMAILS.map(() => "?").join(",")})`).bind(...DEMO_EMAILS).all<{ id: string }>();
  const demoUserIds = demoUsers.results.map((user: { id: string }) => user.id);
  const reportTextPlaceholders = DEMO_REPORT_COMPLETED_WORK.map(() => "?").join(",");
  const demoReportIds = demoUserIds.length > 0
    ? await db.prepare(`SELECT id FROM reports WHERE user_id IN (${demoUserIds.map(() => "?").join(",")}) OR completed_work IN (${reportTextPlaceholders})`).bind(...demoUserIds, ...DEMO_REPORT_COMPLETED_WORK).all<{ id: string }>()
    : await db.prepare(`SELECT id FROM reports WHERE completed_work IN (${reportTextPlaceholders})`).bind(...DEMO_REPORT_COMPLETED_WORK).all<{ id: string }>();
  const reportIds = demoReportIds.results.map((report: { id: string }) => report.id);

  const cleanupStatements = [];
  if (reportIds.length > 0) {
    const reportPlaceholders = reportIds.map(() => "?").join(",");
    cleanupStatements.push(
      db.prepare(`DELETE FROM comments WHERE report_id IN (${reportPlaceholders})`).bind(...reportIds),
      db.prepare(`DELETE FROM audit_logs WHERE entity_type = 'report' AND entity_id IN (${reportPlaceholders})`).bind(...reportIds),
      db.prepare(`DELETE FROM reports WHERE id IN (${reportPlaceholders})`).bind(...reportIds),
    );
  }
  cleanupStatements.push(db.prepare("UPDATE projects SET owner_id = COALESCE(owner_id, ?)").bind(currentUser.id));

  if (demoUserIds.length > 0) {
    const placeholders = demoUserIds.map(() => "?").join(",");
    cleanupStatements.push(
      db.prepare(`DELETE FROM comments WHERE user_id IN (${placeholders})`).bind(...demoUserIds),
      db.prepare(`DELETE FROM audit_logs WHERE user_id IN (${placeholders})`).bind(...demoUserIds),
      db.prepare(`UPDATE projects SET owner_id = ? WHERE owner_id IN (${placeholders})`).bind(currentUser.id, ...demoUserIds),
      db.prepare(`DELETE FROM sessions WHERE user_id IN (${placeholders})`).bind(...demoUserIds),
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).bind(...demoUserIds),
    );
  }

  await db.batch(cleanupStatements);
}

async function currentIdentity(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) {
    const sessionUser = await db.prepare("SELECT u.full_name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ? AND u.status = 'active'")
      .bind(token, new Date().toISOString()).first<{ full_name: string; email: string }>();
    if (sessionUser) return { displayName: sessionUser.full_name, email: sessionUser.email };
  }

  throw new Response("Workspace identity unavailable", { status: 403 });
}

async function requireUser(request: Request) {
  await ensureWorkspaceSchema();
  const identity = await currentIdentity(request);
  if (!isAllowedEmail(identity.email)) throw new Response("Account unavailable", { status: 403 });
  await seedWorkspace(identity.email, identity.displayName);
  const user = await db.prepare("SELECT id, full_name, email, role, team, job_title, status FROM users WHERE email = ?")
    .bind(identity.email.toLowerCase()).first<DbUser>();
  if (!user || user.status !== "active") throw new Response("Account unavailable", { status: 403 });
  return user;
}

async function lookupInvite(token: string) {
  await ensureWorkspaceSchema();
  const invite = await db.prepare("SELECT id, token, email, role, team, job_title, status, expires_at FROM invitations WHERE token = ?")
    .bind(token).first<InviteRow>();
  if (!invite) return null;
  return {
    ...invite,
    expired: new Date(invite.expires_at).getTime() <= Date.now(),
  };
}

async function acceptInvite(payload: Record<string, unknown>, request: Request) {
  await ensureWorkspaceSchema();
  const token = clean(payload, "token");
  const fullName = clean(payload, "fullName");
  const team = clean(payload, "team");
  const jobTitle = clean(payload, "jobTitle");
  const password = clean(payload, "password");
  const confirmPassword = clean(payload, "confirmPassword");
  if (!token || !fullName) return Response.json({ error: "Invite link and name are required" }, { status: 400 });
  const passwordError = validateNewPassword(password, confirmPassword);
  if (passwordError) return Response.json({ error: passwordError }, { status: 400 });

  const invite = await lookupInvite(token);
  if (!invite || invite.status !== "pending" || invite.expired) return Response.json({ error: "Invite link is invalid or expired" }, { status: 400 });

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(invite.email).first<{ id: string }>();
  const userId = existing?.id ?? crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await db.batch([
    existing
      ? db.prepare("UPDATE users SET full_name = ?, password_hash = ?, role = ?, team = ?, job_title = ?, status = 'active' WHERE id = ?").bind(fullName, passwordHash, invite.role, team || invite.team, jobTitle || invite.job_title, userId)
      : db.prepare("INSERT INTO users (id, full_name, email, password_hash, role, team, job_title, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')").bind(userId, fullName, invite.email, passwordHash, invite.role, team || invite.team, jobTitle || invite.job_title),
    db.prepare("UPDATE invitations SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP, accepted_by = ? WHERE id = ?").bind(userId, invite.id),
    db.prepare("INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), userId, sessionToken, expiryDate(SESSION_DAYS)),
  ]);

  return Response.json(
    { ok: true },
    { status: 201, headers: { "set-cookie": sessionCookie(sessionToken, request) } },
  );
}

async function loginUser(payload: Record<string, unknown>, request: Request) {
  await ensureWorkspaceSchema();
  const email = clean(payload, "email").toLowerCase();
  const password = clean(payload, "password");
  if (!email || !isAllowedEmail(email)) return Response.json({ error: "Use your Trivestack email address" }, { status: 400 });
  if (!password) return Response.json({ error: "Password is required" }, { status: 400 });

  const activeUsers = await db.prepare("SELECT COUNT(*)::int AS total FROM users WHERE status = 'active'").first<{ total: number }>();
  if ((activeUsers?.total ?? 0) === 0 && email === INITIAL_SUPER_ADMIN.email) {
    if (password.length < PASSWORD_MIN_LENGTH) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    await seedWorkspace(INITIAL_SUPER_ADMIN.email, INITIAL_SUPER_ADMIN.displayName, await hashPassword(password));
  }

  const user = await db.prepare("SELECT id, full_name, email, password_hash FROM users WHERE email = ? AND status = 'active'")
    .bind(email).first<{ id: string; full_name: string; email: string; password_hash: string | null }>();
  if (!user) return Response.json({ error: "No active account found. Ask the super admin for an invite." }, { status: 404 });
  if (!user.password_hash) {
    if (user.email !== INITIAL_SUPER_ADMIN.email) {
      return Response.json({ error: "Password is not set for this account. Ask the super admin to send a fresh invite." }, { status: 403 });
    }
    if (password.length < PASSWORD_MIN_LENGTH) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(password), user.id).run();
  } else if (!(await verifyPassword(password, user.password_hash))) {
    return Response.json({ error: "Invalid email or password" }, { status: 403 });
  }

  const sessionToken = crypto.randomUUID();
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE user_id = ? OR expires_at <= ?").bind(user.id, new Date().toISOString()),
    db.prepare("INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), user.id, sessionToken, expiryDate(SESSION_DAYS)),
  ]);
  return Response.json(
    { ok: true, user: { name: user.full_name, email: user.email } },
    { headers: { "set-cookie": sessionCookie(sessionToken, request) } },
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const inviteToken = url.searchParams.get("invite");
    if (inviteToken) {
      const invite = await lookupInvite(inviteToken);
      if (!invite) return Response.json({ error: "Invite not found" }, { status: 404 });
      return Response.json({ invite });
    }

    const user = await requireUser(request);
    const leadershipRole = user.role === "super_admin" || user.role === "stakeholder";
    const reports = await db.prepare("SELECT r.*, u.full_name AS owner_name, u.team AS owner_team, p.name AS project_name FROM reports r JOIN users u ON u.id = r.user_id JOIN projects p ON p.id = r.project_id ORDER BY COALESCE(r.report_date, r.submitted_at::date::text, r.created_at::date::text) DESC, COALESCE(r.submitted_at, r.created_at) DESC").all<ReportRow>();
    const projects = await db.prepare("SELECT p.*, COALESCE(u.full_name, 'Unassigned') AS owner_name, COUNT(r.id)::int AS report_count FROM projects p LEFT JOIN users u ON u.id = p.owner_id LEFT JOIN reports r ON r.project_id = p.id GROUP BY p.id, u.full_name ORDER BY p.name").all();
    let submissionStats: SubmissionStats | null = null;
    if (leadershipRole) {
      const totalUsers = await db.prepare("SELECT COUNT(*)::int AS total FROM users WHERE status = 'active'").first<{ total: number }>();
      const submittedUsers = new Set(
        reports.results
          .filter((report: ReportRow) => report.report_type === "weekly" && report.submitted_at)
          .map((report: ReportRow) => report.user_id),
      ).size;
      submissionStats = {
        submittedUsers,
        totalUsers: totalUsers?.total ?? 0,
        pendingUsers: Math.max((totalUsers?.total ?? 0) - submittedUsers, 0),
      };
    }
    const users = leadershipRole
      ? await db.prepare("SELECT id, full_name, email, role, team, job_title, status, created_at FROM users ORDER BY full_name").all<Record<string, unknown>>()
      : { results: [] };
    const invitations = user.role === "super_admin"
      ? await db.prepare("SELECT i.*, u.full_name AS invited_by_name FROM invitations i JOIN users u ON u.id = i.invited_by ORDER BY i.created_at DESC").all<Record<string, unknown> & { token: string }>()
      : { results: [] };
    const settingsRows = await db.prepare("SELECT key, value FROM workspace_settings").all<SettingsRow>();
    const settings = Object.fromEntries(settingsRows.results.map((row: SettingsRow) => [row.key, row.value]));

    return Response.json({
      user,
      reports: reports.results,
      projects: projects.results,
      users: users.results,
      invitations: invitations.results.map((invite: Record<string, unknown> & { token: string }) => ({
        ...invite,
        invite_url: inviteUrl(request, String(invite.token)),
      })),
      settings,
      submissionStats,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load workspace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.action === "login") return loginUser(payload, request);
    if (payload.action === "logout") {
      await ensureWorkspaceSchema();
      const token = cookieValue(request, SESSION_COOKIE);
      if (token) await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
      return Response.json({ ok: true }, { headers: { "set-cookie": expiredSessionCookie(request) } });
    }
    if (payload.action === "accept_invite") return acceptInvite(payload, request);

    const user = await requireUser(request);
    if (payload.action === "update_profile") {
      const fullName = clean(payload, "fullName");
      if (!fullName) return Response.json({ error: "Full name is required" }, { status: 400 });
      const currentPassword = clean(payload, "currentPassword");
      const newPassword = clean(payload, "newPassword");
      const confirmPassword = clean(payload, "confirmPassword");
      const statements = [
        db.prepare("UPDATE users SET full_name = ?, team = ?, job_title = ? WHERE id = ?").bind(fullName, clean(payload, "team", user.team), clean(payload, "jobTitle", user.job_title), user.id),
        db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'profile_updated', 'user', ?, ?)").bind(user.id, user.id, fullName),
      ];

      if (currentPassword || newPassword || confirmPassword) {
        const passwordError = validateNewPassword(newPassword, confirmPassword);
        if (passwordError) return Response.json({ error: passwordError }, { status: 400 });
        const current = await db.prepare("SELECT password_hash FROM users WHERE id = ?").bind(user.id).first<{ password_hash: string | null }>();
        if (current?.password_hash && !(await verifyPassword(currentPassword, current.password_hash))) {
          return Response.json({ error: "Current password is incorrect" }, { status: 403 });
        }
        statements.push(
          db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(newPassword), user.id),
          db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'password_updated', 'user', ?, '')").bind(user.id, user.id),
        );
      }

      await db.batch(statements);
      return Response.json({ ok: true });
    }

    if (payload.action === "invite_user") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      const email = clean(payload, "email").toLowerCase();
      const role = clean(payload, "role", "team_member");
      if (!email || !isAllowedEmail(email)) return Response.json({ error: "Use a Trivestack email address" }, { status: 400 });
      if (!isOneOf(ROLES, role)) return Response.json({ error: "Invalid role" }, { status: 400 });
      const activeUser = await db.prepare("SELECT id FROM users WHERE email = ? AND status = 'active'").bind(email).first();
      if (activeUser) return Response.json({ error: "That user is already active" }, { status: 400 });
      const id = crypto.randomUUID();
      const token = crypto.randomUUID();
      await db.batch([
        db.prepare("UPDATE invitations SET status = 'revoked' WHERE email = ? AND status = 'pending'").bind(email),
        db.prepare("INSERT INTO invitations (id, token, email, role, team, job_title, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, token, email, role, clean(payload, "team", "Product"), clean(payload, "jobTitle", "Team Member"), user.id, expiryDate(14)),
        db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'invite_created', 'invitation', ?, ?)").bind(user.id, id, email),
      ]);
      return Response.json({ ok: true, inviteUrl: inviteUrl(request, token) }, { status: 201 });
    }

    if (payload.action === "revoke_invite") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      const inviteId = clean(payload, "inviteId");
      if (!inviteId) return Response.json({ error: "Invite is required" }, { status: 400 });
      await db.batch([
        db.prepare("UPDATE invitations SET status = 'revoked' WHERE id = ? AND status = 'pending'").bind(inviteId),
        db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'invite_revoked', 'invitation', ?, '')").bind(user.id, inviteId),
      ]);
      return Response.json({ ok: true });
    }

    if (payload.action === "user_role") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      const userId = clean(payload, "userId");
      const role = clean(payload, "role");
      if (!userId || userId === user.id || !isOneOf(ROLES, role)) return Response.json({ error: "Invalid role update" }, { status: 400 });
      const target = await db.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first<{ id: string }>();
      if (!target) return Response.json({ error: "User not found" }, { status: 404 });
      await db.batch([
        db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId),
        db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'role_updated', 'user', ?, ?)").bind(user.id, userId, role),
      ]);
      return Response.json({ ok: true });
    }

    if (payload.action === "user_status") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      const userId = clean(payload, "userId");
      const status = clean(payload, "status");
      if (!userId || userId === user.id || !["active", "inactive"].includes(status)) return Response.json({ error: "Invalid status update" }, { status: 400 });
      await db.batch([
        db.prepare("UPDATE users SET status = ? WHERE id = ?").bind(status, userId),
        db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
        db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'user_status_updated', 'user', ?, ?)").bind(user.id, userId, status),
      ]);
      return Response.json({ ok: true });
    }

    if (payload.action === "add_project" || payload.action === "update_project") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      const name = clean(payload, "name");
      const status = clean(payload, "status", "active");
      if (!name) return Response.json({ error: "Project name is required" }, { status: 400 });
      if (!isOneOf(PROJECT_STATUSES, status)) return Response.json({ error: "Invalid project status" }, { status: 400 });
      if (payload.action === "update_project") {
        const projectId = clean(payload, "projectId");
        if (!projectId) return Response.json({ error: "Project is required" }, { status: 400 });
        await db.batch([
          db.prepare("UPDATE projects SET name = ?, description = ?, team = ?, status = ? WHERE id = ?").bind(name, clean(payload, "description"), clean(payload, "team", "Product"), status, projectId),
          db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'project_updated', 'project', ?, ?)").bind(user.id, projectId, name),
        ]);
        return Response.json({ ok: true });
      }
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO projects (id, name, description, owner_id, team, status) VALUES (?, ?, ?, ?, ?, ?)").bind(id, name, clean(payload, "description"), user.id, clean(payload, "team", "Product"), status),
        db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'project_created', 'project', ?, ?)").bind(user.id, id, name),
      ]);
      return Response.json({ ok: true, id }, { status: 201 });
    }

    if (payload.action === "delete_project") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      const projectId = clean(payload, "projectId");
      const linkedReports = await db.prepare("SELECT COUNT(*)::int AS total FROM reports WHERE project_id = ?").bind(projectId).first<{ total: number }>();
      if ((linkedReports?.total ?? 0) > 0) return Response.json({ error: "Projects with reports cannot be deleted" }, { status: 400 });
      await db.batch([
        db.prepare("DELETE FROM projects WHERE id = ?").bind(projectId),
        db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'project_deleted', 'project', ?, '')").bind(user.id, projectId),
      ]);
      return Response.json({ ok: true });
    }

    if (payload.action === "update_settings") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      const entries = ["dailyReminderTime", "weeklyDueDay", "monthlyDue", "inAppReminders", "emailReminders", "lateSubmissionAlerts"]
        .map((key) => [key, clean(payload, key)] as const);
      await db.batch(entries.map(([key, value]) => db.prepare("INSERT INTO workspace_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP").bind(key, value)));
      return Response.json({ ok: true });
    }

    if (user.role === "stakeholder") return Response.json({ error: "Stakeholders cannot create reports" }, { status: 403 });
    const reportType = clean(payload, "reportType");
    const projectId = clean(payload, "projectId");
    const reportDate = clean(payload, "reportDate");
    const completedWork = clean(payload, "completedWork");
    const priority = clean(payload, "priority");
    const status = clean(payload, "status");
    const documentationLinks = clean(payload, "documentationLinks");
    const submitMode = clean(payload, "submitMode", "submit");
    if (!reportType || !projectId || !reportDate || !completedWork || !priority || !status) return Response.json({ error: "Complete all required fields" }, { status: 400 });
    if (!isOneOf(REPORT_TYPES, reportType)) return Response.json({ error: "Invalid report type" }, { status: 400 });
    if (!validReportDate(reportDate)) return Response.json({ error: "Choose a valid report date" }, { status: 400 });
    if (reportDate > new Date().toISOString().slice(0, 10)) return Response.json({ error: "Report date cannot be in the future" }, { status: 400 });
    if (!isOneOf(PRIORITIES, priority)) return Response.json({ error: "Invalid priority" }, { status: 400 });
    if (!isOneOf(REPORT_STATUSES, status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    if (!["draft", "submit"].includes(submitMode)) return Response.json({ error: "Invalid submit mode" }, { status: 400 });
    if (!validHttpUrl(documentationLinks)) return Response.json({ error: "Documentation link must be a valid HTTP URL" }, { status: 400 });
    const plannedItems = parsePlannedWorkItems(payload);
    const plannedWork = plannedWorkSummary(plannedItems);
    const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first<{ id: string }>();
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    const id = crypto.randomUUID();
    const submittedAt = submitMode === "draft" ? null : new Date().toISOString();
    const periodLabel = periodLabelFor(reportType, reportDate);
    await db.batch([
      db.prepare("INSERT INTO reports (id, user_id, report_type, project_id, report_date, period_label, completed_work, work_in_progress, planned_work, planned_work_items, blockers, support_needed, decisions_needed, documentation_links, priority, status, additional_notes, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, user.id, reportType, projectId, reportDate, periodLabel, completedWork, clean(payload, "workInProgress"), plannedWork, JSON.stringify(plannedItems), clean(payload, "blockers"), clean(payload, "supportNeeded"), clean(payload, "decisionsNeeded"), documentationLinks, priority, status, clean(payload, "additionalNotes"), submittedAt),
      db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, 'report', ?, ?)").bind(user.id, submittedAt ? "report_submitted" : "report_drafted", id, reportType),
    ]);
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save report" }, { status: 500 });
  }
}
