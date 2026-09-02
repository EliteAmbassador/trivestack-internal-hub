import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

type DbUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  team: string;
  job_title: string;
  status: string;
};

async function requireUser() {
  const identity = await getChatGPTUser();
  if (!identity) throw new Response("Unauthorized", { status: 401 });
  await seedWorkspace(identity.email, identity.displayName);
  const user = await env.DB.prepare("SELECT id, full_name, email, role, team, job_title, status FROM users WHERE email = ?")
    .bind(identity.email.toLowerCase()).first<DbUser>();
  if (!user || user.status !== "active") throw new Response("Account unavailable", { status: 403 });
  return user;
}

async function seedWorkspace(email: string, displayName: string) {
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  if ((count?.total ?? 0) > 0) {
    await env.DB.prepare("INSERT OR IGNORE INTO users (id, full_name, email, role, team, job_title, status) VALUES (?, ?, ?, 'team_member', 'Product', 'Team Member', 'active')")
      .bind(crypto.randomUUID(), displayName || email, email.toLowerCase()).run();
    return;
  }

  const ownerId = crypto.randomUUID();
  const ceoId = crypto.randomUUID();
  const ctoId = crypto.randomUUID();
  const raymondId = crypto.randomUUID();
  const nobertId = crypto.randomUUID();
  const projectRows = [
    [crypto.randomUUID(), "Trivestack Backoffice", "Merchant operations and commerce administration.", ownerId, "Product", "active"],
    [crypto.randomUUID(), "Trivestack Storefront", "Customer-facing web commerce experience.", nobertId, "Engineering", "active"],
    [crypto.randomUUID(), "Trivestack Social Commerce", "Social selling and structured conversational orders.", raymondId, "Engineering", "active"],
    [crypto.randomUUID(), "WhatsApp Shopping Assistant", "AI-assisted product discovery and checkout on WhatsApp.", raymondId, "Engineering", "active"],
    [crypto.randomUUID(), "Offline Sales Recorder", "Reliable offline transaction and inventory recording.", ownerId, "Product", "paused"],
    [crypto.randomUUID(), "POS Payment Bridge", "Unified payment-terminal bridge for POS workflows.", ctoId, "Engineering", "active"],
    [crypto.randomUUID(), "Fulfilment and Delivery", "Fulfilment model and delivery partner integration.", ownerId, "Product", "active"],
  ];

  const statements = [
    env.DB.prepare("INSERT INTO users (id, full_name, email, role, team, job_title, status) VALUES (?, ?, ?, ?, ?, ?, 'active')").bind(ownerId, displayName || "Victor Ogunbode", email.toLowerCase(), "super_admin", "Product", "Product Manager"),
    env.DB.prepare("INSERT INTO users (id, full_name, email, role, team, job_title, status) VALUES (?, ?, ?, ?, ?, ?, 'active')").bind(ceoId, "CEO User", "ceo@trivestack.com", "stakeholder", "Leadership", "CEO"),
    env.DB.prepare("INSERT INTO users (id, full_name, email, role, team, job_title, status) VALUES (?, ?, ?, ?, ?, ?, 'active')").bind(ctoId, "CTO User", "cto@trivestack.com", "stakeholder", "Leadership", "CTO"),
    env.DB.prepare("INSERT INTO users (id, full_name, email, role, team, job_title, status) VALUES (?, ?, ?, ?, ?, ?, 'active')").bind(raymondId, "Raymond", "raymond@trivestack.com", "team_member", "Engineering", "Social Commerce Lead"),
    env.DB.prepare("INSERT INTO users (id, full_name, email, role, team, job_title, status) VALUES (?, ?, ?, ?, ?, ?, 'active')").bind(nobertId, "Nobert", "nobert@trivestack.com", "team_member", "Engineering", "Storefront Lead"),
    ...projectRows.map((row) => env.DB.prepare("INSERT INTO projects (id, name, description, owner_id, team, status) VALUES (?, ?, ?, ?, ?, ?)").bind(...row)),
  ];
  await env.DB.batch(statements);

  const reportSeed = [
    [raymondId, 3, "weekly", "Aug 24–30, 2026", "Improved product search and refined the WhatsApp cart update flow.", "Testing multi-category product discovery.", "Complete cart quantity update and merchant pilot test.", "Payment provider test credentials pending.", "Credentials from engineering leadership.", "Confirm pilot merchants.", "https://docs.google.com/whatsapp-commerce", "high", "in_progress"],
    [nobertId, 1, "weekly", "Aug 24–30, 2026", "Updated storefront checkout and fulfilment selection.", "Mobile validation and accessibility clean-up.", "Complete order confirmation states.", "", "", "", "https://figma.com/storefront", "medium", "completed"],
    [ownerId, 0, "daily", "Aug 31, 2026", "Reviewed bulk catalogue upload and inventory intelligence requirements.", "Preparing product specifications for engineering.", "Align scope with technical lead.", "Merchant source data formats are inconsistent.", "Engineering feasibility input.", "Choose XLSX import validation approach.", "https://docs.google.com/backoffice-prd", "high", "needs_review"],
    [ctoId, 5, "monthly", "August 2026", "Completed terminal provider technical assessment.", "Simulator testing for CBS and NIBSS.", "Validate authoritative webhook flow.", "Production-grade provider credentials unavailable.", "Escalation to payment partner.", "Confirm fallback reconciliation process.", "https://docs.google.com/pos-bridge", "critical", "blocked"],
  ];
  await env.DB.batch(reportSeed.map((r) => env.DB.prepare("INSERT INTO reports (id, user_id, project_id, report_type, period_label, completed_work, work_in_progress, planned_work, blockers, support_needed, decisions_needed, documentation_links, priority, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)").bind(crypto.randomUUID(), r[0], projectRows[Number(r[1])][0], ...r.slice(2))));
}

export async function GET() {
  try {
    const user = await requireUser();
    const reportSql = user.role === "super_admin" || user.role === "stakeholder"
      ? "SELECT r.*, u.full_name AS owner_name, u.team AS owner_team, p.name AS project_name FROM reports r JOIN users u ON u.id = r.user_id JOIN projects p ON p.id = r.project_id ORDER BY COALESCE(r.submitted_at, r.created_at) DESC"
      : user.role === "team_lead"
        ? "SELECT r.*, u.full_name AS owner_name, u.team AS owner_team, p.name AS project_name FROM reports r JOIN users u ON u.id = r.user_id JOIN projects p ON p.id = r.project_id WHERE u.team = ? ORDER BY COALESCE(r.submitted_at, r.created_at) DESC"
        : "SELECT r.*, u.full_name AS owner_name, u.team AS owner_team, p.name AS project_name FROM reports r JOIN users u ON u.id = r.user_id JOIN projects p ON p.id = r.project_id WHERE r.user_id = ? ORDER BY COALESCE(r.submitted_at, r.created_at) DESC";
    const binding = user.role === "team_lead" ? user.team : user.id;
    const reports = user.role === "super_admin" || user.role === "stakeholder"
      ? await env.DB.prepare(reportSql).all()
      : await env.DB.prepare(reportSql).bind(binding).all();
    const projects = await env.DB.prepare("SELECT p.*, u.full_name AS owner_name, COUNT(r.id) AS report_count FROM projects p LEFT JOIN users u ON u.id = p.owner_id LEFT JOIN reports r ON r.project_id = p.id GROUP BY p.id ORDER BY p.name").all();
    const users = user.role === "super_admin" ? await env.DB.prepare("SELECT id, full_name, email, role, team, job_title, status, created_at FROM users ORDER BY full_name").all() : { results: [] };
    return Response.json({ user, reports: reports.results, projects: projects.results, users: users.results });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load workspace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = await request.json() as Record<string, string>;
    if (payload.action === "user_role") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      if (!payload.userId || !["team_member", "team_lead", "stakeholder", "super_admin"].includes(payload.role)) return Response.json({ error: "Invalid role update" }, { status: 400 });
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(payload.role, payload.userId),
        env.DB.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'role_updated', 'user', ?, ?)").bind(user.id, payload.userId, payload.role),
      ]);
      return Response.json({ ok: true });
    }

    if (payload.action === "add_user") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      if (!payload.fullName?.trim() || !payload.email?.trim()) return Response.json({ error: "Name and email are required" }, { status: 400 });
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id, full_name, email, role, team, job_title, status) VALUES (?, ?, ?, ?, ?, ?, 'active')").bind(id, payload.fullName.trim(), payload.email.trim().toLowerCase(), payload.role || "team_member", payload.team || "Product", payload.jobTitle || "Team Member"),
        env.DB.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'user_created', 'user', ?, ?)").bind(user.id, id, payload.email.trim().toLowerCase()),
      ]);
      return Response.json({ ok: true, id }, { status: 201 });
    }

    if (payload.action === "add_project") {
      if (user.role !== "super_admin") return Response.json({ error: "Forbidden" }, { status: 403 });
      if (!payload.name?.trim()) return Response.json({ error: "Project name is required" }, { status: 400 });
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO projects (id, name, description, owner_id, team, status) VALUES (?, ?, ?, ?, ?, ?)").bind(id, payload.name.trim(), payload.description || "", user.id, payload.team || "Product", payload.status || "active"),
        env.DB.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'project_created', 'project', ?, ?)").bind(user.id, id, payload.name.trim()),
      ]);
      return Response.json({ ok: true, id }, { status: 201 });
    }

    const required = ["reportType", "projectId", "periodLabel", "completedWork", "priority", "status"];
    if (required.some((key) => !payload[key]?.trim())) return Response.json({ error: "Complete all required fields" }, { status: 400 });
    const id = crypto.randomUUID();
    const submittedAt = payload.submitMode === "draft" ? null : new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO reports (id, user_id, report_type, project_id, period_label, completed_work, work_in_progress, planned_work, blockers, support_needed, decisions_needed, documentation_links, priority, status, additional_notes, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, user.id, payload.reportType, payload.projectId, payload.periodLabel, payload.completedWork, payload.workInProgress ?? "", payload.plannedWork ?? "", payload.blockers ?? "", payload.supportNeeded ?? "", payload.decisionsNeeded ?? "", payload.documentationLinks ?? "", payload.priority, payload.status, payload.additionalNotes ?? "", submittedAt),
      env.DB.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, 'report', ?, ?)").bind(user.id, submittedAt ? "report_submitted" : "report_drafted", id, payload.reportType),
    ]);
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save report" }, { status: 500 });
  }
}
