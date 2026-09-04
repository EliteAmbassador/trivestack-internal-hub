"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Bell,
  Blocks,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clipboard,
  Edit3,
  FilePlus2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type AppUser = { name: string; email: string };
type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  team: string;
  job_title: string;
  status: string;
  created_at?: string;
};
type Project = {
  id: string;
  name: string;
  description: string;
  owner_name: string;
  team: string;
  status: string;
  report_count: number;
};
type Report = {
  id: string;
  user_id: string;
  owner_name: string;
  owner_team: string;
  report_type: string;
  project_id: string;
  project_name: string;
  report_date: string | null;
  period_label: string;
  completed_work: string;
  work_in_progress: string;
  planned_work: string;
  planned_work_items: string | null;
  blockers: string;
  support_needed: string;
  decisions_needed: string;
  documentation_links: string;
  priority: string;
  status: string;
  additional_notes: string;
  submitted_at: string | null;
  created_at: string;
};
type PlannedWorkItem = {
  id: string;
  text: string;
  priority: string;
};
type Invitation = {
  id: string;
  token: string;
  email: string;
  role: string;
  team: string;
  job_title: string;
  status: string;
  expires_at: string;
  invite_url: string;
  invited_by_name?: string;
  created_at?: string;
};
type WorkspaceSettings = Record<string, string>;
type WorkspaceData = {
  user: User;
  reports: Report[];
  projects: Project[];
  users: User[];
  invitations: Invitation[];
  settings: WorkspaceSettings;
  submissionStats: {
    submittedUsers: number;
    totalUsers: number;
    pendingUsers: number;
  } | null;
};
type ReportDraftFields = {
  completedWork: string;
  workInProgress: string;
  blockers: string;
  supportNeeded: string;
  decisionsNeeded: string;
  documentationLinks: string;
  additionalNotes: string;
};
type ViewId =
  | "dashboard"
  | "add"
  | "my-reports"
  | "all-reports"
  | "generate"
  | "blockers"
  | "projects"
  | "team"
  | "users"
  | "settings";

const navGroups: {
  label: string;
  items: {
    id: ViewId;
    label: string;
    icon: typeof LayoutDashboard;
    capability?: "view_reports" | "view_team" | "manage";
    readOnly?: boolean;
  }[];
}[] = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "add", label: "Add report", icon: FilePlus2, readOnly: true },
      { id: "my-reports", label: "My reports", icon: FileText },
      { id: "all-reports", label: "All reports", icon: BarChart3, capability: "view_reports" },
      { id: "generate", label: "Generate report", icon: Sparkles },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "blockers", label: "Blockers", icon: Blocks },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "team", label: "Team", icon: Users, capability: "view_team" },
      { id: "users", label: "Users & invites", icon: ShieldCheck, capability: "manage" },
      { id: "settings", label: "Settings", icon: Settings, capability: "manage" },
    ],
  },
];

const reportStatuses = ["not_started", "in_progress", "completed", "blocked", "delayed", "on_hold", "needs_review"];
const roles = ["team_member", "team_lead", "stakeholder", "super_admin"];
const projectStatuses = ["active", "paused", "completed"];
const statusStyle: Record<string, string> = {
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  needs_review: "border-amber-200 bg-amber-50 text-amber-800",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  delayed: "border-orange-200 bg-orange-50 text-orange-700",
};
const reportTitles: Record<string, string> = {
  team_weekly: "Weekly Team Report",
  team_monthly: "Monthly Team Report",
  leadership: "Leadership Summary",
  blockers: "Blockers Report",
  own_weekly: "My Weekly Report",
  own_monthly: "My Monthly Report",
  own_blockers: "My Blockers Report",
};

const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const prettyDate = (date?: string | null) =>
  date
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date))
    : "Draft";
const dateToInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayInputValue = () => dateToInputValue(new Date());
const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const validDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const longDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
const monthLabel = (date = new Date()) =>
  new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(date);
const weekRange = (date = new Date()) => {
  const start = new Date(date);
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const format = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${format.format(start)} - ${format.format(end)}`;
};
const reportPeriodLabel = (type: string, reportDate: string) => {
  if (!validDateInput(reportDate)) return "";
  const date = dateFromInput(reportDate);
  if (type === "weekly") return weekRange(date);
  if (type === "monthly") return monthLabel(date);
  return longDate(date);
};
const reportDisplayDate = (report: Report) =>
  report.report_date ? longDate(dateFromInput(report.report_date)) : prettyDate(report.submitted_at || report.created_at);
const reportDateInputValue = (report: Report) => {
  if (report.report_date) return report.report_date;
  const fallbackDate = new Date(report.submitted_at || report.created_at);
  return Number.isNaN(fallbackDate.getTime()) ? "" : dateToInputValue(fallbackDate);
};
const reportSubmittedDateInputValue = (report: Report) => {
  const date = new Date(report.submitted_at || report.created_at);
  return Number.isNaN(date.getTime()) ? "" : dateToInputValue(date);
};
const weekBounds = (dateInput: string) => {
  const start = dateFromInput(dateInput);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: dateToInputValue(start), end: dateToInputValue(end) };
};
const emptyReportDraftFields = (): ReportDraftFields => ({
  completedWork: "",
  workInProgress: "",
  blockers: "",
  supportNeeded: "",
  decisionsNeeded: "",
  documentationLinks: "",
  additionalNotes: "",
});
const fieldMap: Record<keyof ReportDraftFields, keyof Report> = {
  completedWork: "completed_work",
  workInProgress: "work_in_progress",
  blockers: "blockers",
  supportNeeded: "support_needed",
  decisionsNeeded: "decisions_needed",
  documentationLinks: "documentation_links",
  additionalNotes: "additional_notes",
};
const sourceLine = (report: Report, value: string) => `- ${report.period_label}: ${value}`;
const compiledSection = (reports: Report[], field: keyof ReportDraftFields) =>
  reports
    .map((report) => {
      const value = String(report[fieldMap[field]] ?? "").trim();
      return value ? sourceLine(report, value) : "";
    })
    .filter(Boolean)
    .join("\n");
const priorityWeight: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const highestPriority = (reports: Report[]) =>
  reports.reduce((winner, report) => (priorityWeight[report.priority] > priorityWeight[winner] ? report.priority : winner), "medium");
const newPlannedWorkItem = (values: Partial<PlannedWorkItem> = {}): PlannedWorkItem => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  text: "",
  priority: "medium",
  ...values,
});
const plannedItemsFromReport = (report: Report): PlannedWorkItem[] => {
  if (report.planned_work_items) {
    try {
      const parsed = JSON.parse(report.planned_work_items);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, index) => ({
            id: String(item.id || `${report.id}-${index}`),
            text: String(item.text ?? "").trim(),
            priority: String(item.priority ?? "medium"),
          }))
          .filter((item) => item.text);
      }
    } catch {
      // Fall through to the legacy text field.
    }
  }
  return report.planned_work.trim()
    ? [newPlannedWorkItem({ id: report.id, text: report.planned_work.trim(), priority: report.priority })]
    : [];
};

async function postAction(payload: Record<string, unknown>) {
  const response = await fetch("/api/workspace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Action failed");
  return body;
}

async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
  toast.success("Copied");
}

export function ProductWorkspace({ user: identity }: { user: AppUser }) {
  const [view, setView] = useState<ViewId>("dashboard");
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function loadWorkspace(showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Workspace data could not be loaded");
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The workspace data could not be loaded.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const currentUser = data?.user;
  const displayName = currentUser?.full_name || identity.name;
  const role = currentUser?.role ?? "super_admin";
  const isAdmin = role === "super_admin";
  const isLeadership = isAdmin || role === "stakeholder";
  const readOnly = role === "stakeholder";
  const canViewReports = true;
  const canViewTeam = isLeadership;
  const visibleGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.readOnly && readOnly) return false;
      if (item.capability === "manage") return isAdmin;
      if (item.capability === "view_team") return canViewTeam;
      if (item.capability === "view_reports") return canViewReports;
      return true;
    }),
  }));
  const myReports = data?.reports.filter((report) => report.user_id === currentUser?.id) ?? [];

  function navigate(next: ViewId) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function runSearch() {
    if (query.trim()) navigate(canViewReports ? "all-reports" : "my-reports");
  }

  async function logout() {
    try {
      await postAction({ action: "logout" });
      window.location.href = "/login";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logout failed");
    }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r-0 bg-[#17153b] text-white">
        <SidebarHeader className="h-[76px] justify-center border-b border-white/10 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ff7d66] font-black text-[#17153b] shadow-[0_8px_24px_rgba(255,125,102,.24)]">
              T
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[15px] font-bold tracking-tight">Trivestack</p>
              <p className="truncate text-[11px] text-indigo-200/70">Internal Reports</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          {visibleGroups.map((group) => (
            <SidebarGroup key={group.label} className="py-2">
              <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-200/45">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        tooltip={item.label}
                        isActive={view === item.id}
                        onClick={() => navigate(item.id)}
                        className="h-10 rounded-xl px-3 text-indigo-100/75 hover:bg-white/8 hover:text-white data-[active=true]:bg-[#ff7d66] data-[active=true]:font-semibold data-[active=true]:text-[#17153b]"
                      >
                        <item.icon className="size-[17px]" />
                        <span>{item.label}</span>
                        {item.id === "blockers" && !!data?.reports.some((report) => report.blockers) && (
                          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] group-data-[collapsible=icon]:hidden">
                            {data.reports.filter((report) => report.blockers && report.status !== "completed").length}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl bg-white/[.06] p-2.5 text-left transition hover:bg-white/[.1]"
          >
            <Avatar name={displayName} />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-semibold text-white">{displayName}</p>
              <p className="truncate text-[10px] text-indigo-200/55">{titleCase(role)}</p>
            </div>
            <MoreHorizontal className="ml-auto size-4 text-indigo-200/55 group-data-[collapsible=icon]:hidden" />
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-indigo-100/70 transition hover:bg-white/[.08] hover:text-white"
          >
            <LogOut className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">Log out</span>
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f4f6fb]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center border-b border-[#e3e7f0] bg-white/95 px-4 backdrop-blur md:px-7">
          <SidebarTrigger className="mr-3 text-slate-500" />
          <div className="relative hidden w-full max-w-sm sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && runSearch()}
              onFocus={() => query && runSearch()}
              className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 shadow-none"
              placeholder="Search reports, projects, blockers..."
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl text-slate-500"
              onClick={() => {
                if (data?.reports.some((report) => report.blockers)) navigate("blockers");
                else toast.info("No active blocker alerts.");
              }}
            >
              <Bell className="size-[18px]" />
              {!!data?.reports.some((report) => report.blockers) && (
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#ff7d66]" />
              )}
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl bg-white" onClick={() => setProfileOpen(true)}>
              <UserCog className="size-4" />
            </Button>
            {!readOnly && (
              <Button onClick={() => navigate("add")} className="rounded-xl bg-[#3d3a82] text-white shadow-none hover:bg-[#2f2c6c]">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add report</span>
              </Button>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1540px] px-4 py-6 md:px-7 md:py-8">
          {loading ? (
            <LoadingView />
          ) : !data ? (
            <EmptyState title="Workspace unavailable" copy="Refresh the page to try loading the reporting workspace again." />
          ) : (
            <>
              {view === "dashboard" && (
                <Dashboard data={data} isAdmin={isAdmin} isLeadership={isLeadership} onNavigate={navigate} onSelect={setSelectedReport} />
              )}
              {view === "add" && (
                <AddReport
                  projects={data.projects}
                  reports={data.reports}
                  currentUser={data.user}
                  onSaved={async () => { await loadWorkspace(); navigate("my-reports"); }}
                />
              )}
              {(view === "my-reports" || view === "all-reports") && (
                <ReportsView
                  reports={view === "my-reports" ? myReports : data.reports}
                  title={view === "my-reports" ? "My reports" : "All team reports"}
                  initialSearch={query}
                  onSelect={setSelectedReport}
                />
              )}
              {view === "generate" && <GenerateReport reports={data.reports} projects={data.projects} currentUser={data.user} canAggregate={isLeadership} />}
              {view === "blockers" && <BlockersView reports={data.reports} onSelect={setSelectedReport} />}
              {view === "projects" && (
                <ProjectsView projects={data.projects} reports={data.reports} isAdmin={isAdmin} onUpdated={() => loadWorkspace()} />
              )}
              {view === "team" && <TeamView users={data.users} reports={data.reports} />}
              {view === "users" && (
                <UsersView users={data.users} invitations={data.invitations} currentId={data.user.id} onUpdated={() => loadWorkspace()} />
              )}
              {view === "settings" && <SettingsView settings={data.settings} onSaved={() => loadWorkspace()} />}
            </>
          )}
        </main>
      </SidebarInset>

      {data && (
        <ProfileDialog
          open={profileOpen}
          user={data.user}
          onOpenChange={setProfileOpen}
          onSaved={async () => {
            setProfileOpen(false);
            await loadWorkspace();
          }}
        />
      )}
      <ReportDialog report={selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)} />
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}

function Dashboard({
  data,
  isAdmin,
  isLeadership,
  onNavigate,
  onSelect,
}: {
  data: WorkspaceData;
  isAdmin: boolean;
  isLeadership: boolean;
  onNavigate: (view: ViewId) => void;
  onSelect: (report: Report) => void;
}) {
  const activeBlockers = data.reports.filter((report) => report.blockers && report.status !== "completed");
  const highPriority = data.reports.filter((report) => ["high", "critical"].includes(report.priority));
  const teamSize = Math.max(data.submissionStats?.totalUsers ?? 0, 1);
  const rate = data.submissionStats ? Math.round((data.submissionStats.submittedUsers / teamSize) * 100) : 0;
  const hasReports = data.reports.length > 0;
  const ownReports = data.reports.filter((report) => report.user_id === data.user.id);
  const ownDrafts = ownReports.filter((report) => !report.submitted_at);
  const canQuickAddReport = data.user.role === "team_member" || data.user.role === "team_lead";

  return (
    <>
      <PageHeader
        eyebrow={longDate()}
        title={`Good morning, ${data.user.full_name.split(" ")[0]}.`}
        copy="Your production workspace is ready for real team reports."
        actions={
          <>
            {isLeadership && data.users.length > 0 && (
              <Button variant="outline" onClick={() => onNavigate("team")} className="rounded-xl bg-white">
                View submissions
              </Button>
            )}
            {canQuickAddReport && (
              <Button variant="outline" onClick={() => onNavigate("add")} className="rounded-xl bg-white">
                <FilePlus2 className="size-4" />
                Add report
              </Button>
            )}
            <Button onClick={() => onNavigate("generate")} className="rounded-xl bg-[#ff7d66] font-semibold text-[#271b33] hover:bg-[#ff6b52]">
              <Sparkles className="size-4" />
              {isLeadership ? "Generate summary" : "Generate my report"}
            </Button>
          </>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Reports this week" value={String(data.reports.filter((report) => report.report_type === "weekly").length)} note="Live team updates" icon={FileText} tone="indigo" />
        {isLeadership && data.submissionStats && (
          <MetricCard label="Submission rate" value={`${rate}%`} note={`${data.submissionStats.submittedUsers} of ${teamSize} team members`} icon={CheckCircle2} tone="blue" progress={rate} />
        )}
        {data.user.role === "team_member" && (
          <MetricCard label="Drafts pending" value={String(ownDrafts.length)} note="Your unsubmitted updates" icon={Clipboard} tone="blue" />
        )}
        <MetricCard label="Active blockers" value={String(activeBlockers.length)} note={`${activeBlockers.filter((report) => report.decisions_needed).length} need leadership input`} icon={AlertTriangle} tone="coral" />
        <MetricCard label="High priority" value={String(highPriority.length)} note={`Across ${new Set(highPriority.map((report) => report.project_id)).size} projects`} icon={ArrowUpRight} tone="amber" />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,.7fr)]">
        <Panel
          title="Recent team reports"
          copy={hasReports ? "Latest updates across the product team" : "No reports yet. Invite team members or add your first report."}
          action={<Button variant="ghost" size="sm" onClick={() => onNavigate("all-reports")} className="text-[#5652a3]">View all <ChevronRight className="size-4" /></Button>}
        >
          {hasReports ? (
            <ReportTable reports={data.reports.slice(0, 5)} onSelect={onSelect} />
          ) : (
            <InlineEmpty title="No live reports" copy="Demo reports have been cleared. New submissions will appear here." />
          )}
        </Panel>
        <div className="grid content-start gap-5">
          {isAdmin ? (
            <div className="rounded-2xl bg-[#29265e] p-5 text-white shadow-[0_16px_36px_rgba(41,38,94,.14)]">
              <div className="flex items-start justify-between">
                <div className="grid size-10 place-items-center rounded-xl bg-white/10">
                  <Mail className="size-5 text-[#ff9a87]" />
                </div>
                <Badge className="border-0 bg-[#ff7d66] text-[#29203a] hover:bg-[#ff7d66]">Invite only</Badge>
              </div>
              <h2 className="mt-5 text-lg font-bold">{data.invitations.filter((invite) => invite.status === "pending").length} pending invitations</h2>
              <p className="mt-1 text-sm leading-6 text-indigo-100/65">Invite teammates by email, then share the generated signup link.</p>
              <Button onClick={() => onNavigate("users")} className="mt-5 w-full rounded-xl bg-white text-[#29265e] hover:bg-indigo-50">
                Manage invites <ArrowUpRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#29265e] p-5 text-white shadow-[0_16px_36px_rgba(41,38,94,.14)]">
              <div className="grid size-10 place-items-center rounded-xl bg-white/10">
                <FilePlus2 className="size-5 text-[#ff9a87]" />
              </div>
              <h2 className="mt-5 text-lg font-bold">{ownReports.length} of your reports</h2>
              <p className="mt-1 text-sm leading-6 text-indigo-100/65">Create your own updates and generate summaries from your submitted work.</p>
              <Button onClick={() => onNavigate("my-reports")} className="mt-5 w-full rounded-xl bg-white text-[#29265e] hover:bg-indigo-50">
                View my reports <ArrowUpRight className="size-4" />
              </Button>
            </div>
          )}
          {isLeadership && data.submissionStats && (
            <div className="rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-[#201e38]">Weekly submission</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Due {titleCase(data.settings.weeklyDueDay ?? "friday")}, {data.settings.dailyReminderTime ?? "5:00 PM"}</p>
                </div>
                <span className="text-xl font-extrabold text-[#3d3a82]">{rate}%</span>
              </div>
              <Progress value={rate} className="mt-4 h-2 bg-indigo-50 [&>div]:bg-[#6d68c5]" />
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  {data.submissionStats.submittedUsers} submitted
                </span>
                <span className="flex items-center gap-2 text-amber-700">
                  <CircleDot className="size-4" />
                  {data.submissionStats.pendingUsers} pending
                </span>
              </div>
            </div>
          )}
          {!isLeadership && (
            <div className="rounded-2xl border bg-white p-5">
              <div>
                <h2 className="font-bold text-[#201e38]">Your next report</h2>
                <p className="mt-0.5 text-xs text-slate-500">Due {titleCase(data.settings.weeklyDueDay ?? "friday")}, {data.settings.dailyReminderTime ?? "5:00 PM"}</p>
              </div>
              <Button onClick={() => onNavigate("add")} className="mt-5 w-full rounded-xl bg-[#3d3a82]">
                <FilePlus2 className="size-4" />
                Add report
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function AddReport({
  projects,
  reports,
  currentUser,
  onSaved,
}: {
  projects: Project[];
  reports: Report[];
  currentUser: User;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState("daily");
  const [projectId, setProjectId] = useState("");
  const [reportDate, setReportDate] = useState(todayInputValue());
  const [priority, setPriority] = useState("medium");
  const [statusValue, setStatusValue] = useState("in_progress");
  const [draftFields, setDraftFields] = useState<ReportDraftFields>(emptyReportDraftFields);
  const [plannedItems, setPlannedItems] = useState<PlannedWorkItem[]>(() => [newPlannedWorkItem()]);
  const [saving, setSaving] = useState(false);
  const periodLabel = reportPeriodLabel(type, reportDate);

  function updateDraftField(field: keyof ReportDraftFields, value: string) {
    setDraftFields((current) => ({ ...current, [field]: value }));
  }

  function resetReportForm() {
    setProjectId("");
    setReportDate(todayInputValue());
    setPriority("medium");
    setStatusValue("in_progress");
    setDraftFields(emptyReportDraftFields());
    setPlannedItems([newPlannedWorkItem()]);
  }

  function updatePlannedItem(id: string, updates: Partial<PlannedWorkItem>) {
    setPlannedItems((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));
  }

  function removePlannedItem(id: string) {
    setPlannedItems((current) => current.length === 1 ? [newPlannedWorkItem()] : current.filter((item) => item.id !== id));
  }

  function addPlannedItem() {
    setPlannedItems((current) => [...current, newPlannedWorkItem()]);
  }

  function generatedStatus(sourceReports: Report[]) {
    if (sourceReports.some((report) => report.status === "blocked")) return "blocked";
    if (sourceReports.every((report) => report.status === "completed")) return "completed";
    if (sourceReports.some((report) => report.status === "needs_review")) return "needs_review";
    return "in_progress";
  }

  function generatePeriodReport() {
    if (type === "daily") return;
    if (!projectId) {
      toast.error("Choose a project first.");
      return;
    }
    if (!validDateInput(reportDate)) {
      toast.error("Choose a valid report date.");
      return;
    }

    const sourceType = type === "weekly" ? "daily" : "weekly";
    const bounds = weekBounds(reportDate);
    const selectedSources = reports
      .filter((report) => {
        if (report.user_id !== currentUser.id) return false;
        if (report.project_id !== projectId) return false;
        if (report.report_type !== sourceType) return false;
        if (!report.submitted_at) return false;
        const sourceDate = reportDateInputValue(report);
        if (type === "weekly") return sourceDate >= bounds.start && sourceDate <= bounds.end;
        return sourceDate.startsWith(reportDate.slice(0, 7));
      })
      .sort((left, right) => reportDateInputValue(left).localeCompare(reportDateInputValue(right)));

    if (selectedSources.length === 0) {
      toast.info(type === "weekly" ? "No submitted daily reports found for that week." : "No submitted weekly reports found for that month.");
      return;
    }

    setDraftFields({
      completedWork: compiledSection(selectedSources, "completedWork"),
      workInProgress: compiledSection(selectedSources, "workInProgress"),
      blockers: compiledSection(selectedSources, "blockers"),
      supportNeeded: compiledSection(selectedSources, "supportNeeded"),
      decisionsNeeded: compiledSection(selectedSources, "decisionsNeeded"),
      documentationLinks: selectedSources.map((report) => report.documentation_links.trim()).find(Boolean) ?? "",
      additionalNotes: `Generated from ${selectedSources.length} ${sourceType} ${selectedSources.length === 1 ? "report" : "reports"}.`,
    });
    const generatedPlannedItems = selectedSources.flatMap((report) =>
      plannedItemsFromReport(report).map((item) =>
        newPlannedWorkItem({
          text: `${report.period_label}: ${item.text}`,
          priority: item.priority,
        }),
      ),
    );
    setPlannedItems(generatedPlannedItems.length ? generatedPlannedItems : [newPlannedWorkItem()]);
    setPriority(highestPriority(selectedSources));
    setStatusValue(generatedStatus(selectedSources));
    toast.success(type === "weekly" ? "Weekly report drafted from daily reports." : "Monthly report drafted from weekly reports.");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>, mode: "draft" | "submit") {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    try {
      await postAction({ ...values, reportType: type, submitMode: mode });
      toast.success(mode === "draft" ? "Report saved as draft" : "Report submitted");
      form.reset();
      resetReportForm();
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save report");
    } finally {
      setSaving(false);
    }
  }

  if (projects.length === 0) {
    return <EmptyState title="No projects available" copy="Create a project before adding reports." />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="New structured update" title="Add report" copy="Capture the useful details without turning reporting into another burden." />
      <form onSubmit={(event) => submit(event, "submit")} className="rounded-2xl border bg-white shadow-[0_10px_34px_rgba(39,42,70,.04)]">
        <div className="border-b p-5 md:p-7">
          <Tabs value={type} onValueChange={setType}>
            <TabsList className="grid h-11 w-full max-w-lg grid-cols-3 bg-[#f2f3f8] p-1">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
          <Field label="Project" required>
            <Select name="projectId" value={projectId} onValueChange={setProjectId} required>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Report date" required>
            <Input
              name="reportDate"
              type="date"
              value={reportDate}
              max={todayInputValue()}
              onChange={(event) => setReportDate(event.target.value)}
              required
            />
            <input type="hidden" name="periodLabel" value={periodLabel} />
            <span className="text-xs font-medium text-slate-500">
              {type === "weekly" ? `Week of ${periodLabel}` : type === "monthly" ? periodLabel : periodLabel}
            </span>
          </Field>
          {type !== "daily" && (
            <div className="md:col-span-2 rounded-2xl border border-dashed border-[#cbc9ef] bg-[#f8f8ff] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#201e38]">
                    Generate {type} report
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {type === "weekly"
                      ? "Compile your submitted daily reports for the selected week and project."
                      : "Compile your submitted weekly reports for the selected month and project."}
                  </p>
                </div>
                <Button type="button" variant="outline" disabled={saving} onClick={generatePeriodReport} className="shrink-0 rounded-xl bg-white">
                  <Sparkles className="size-4" />
                  Generate {type}
                </Button>
              </div>
            </div>
          )}
          <Field label={type === "monthly" ? "Major achievements" : type === "weekly" ? "Key tasks completed" : "What I worked on today"} required wide>
            <Textarea name="completedWork" rows={4} placeholder="Use short, specific statements..." value={draftFields.completedWork} onChange={(event) => updateDraftField("completedWork", event.target.value)} required />
          </Field>
          <Field label="Work still in progress" wide><Textarea name="workInProgress" rows={3} value={draftFields.workInProgress} onChange={(event) => updateDraftField("workInProgress", event.target.value)} /></Field>
          <div className="grid content-start gap-3 text-sm font-semibold text-[#312e4c] md:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{type === "daily" ? "What I plan to do next" : type === "weekly" ? "Next week priorities" : "Next month priorities"}</span>
              <Button type="button" variant="outline" size="sm" onClick={addPlannedItem} className="w-fit rounded-xl bg-white">
                <Plus className="size-4" />
                Add item
              </Button>
            </div>
            <input
              type="hidden"
              name="plannedWorkItems"
              value={JSON.stringify(plannedItems.map(({ text, priority }) => ({ text, priority })))}
            />
            <div className="space-y-3">
              {plannedItems.map((item, index) => (
                <div key={item.id} className="rounded-2xl border bg-[#fafbfe] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-[.08em] text-slate-400">Item {index + 1}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePlannedItem(item.id)} className="size-8 rounded-xl text-slate-400 hover:text-rose-600">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={item.text}
                    onChange={(event) => updatePlannedItem(item.id, { text: event.target.value })}
                    rows={2}
                    placeholder="Describe the next task..."
                    className="mt-2 bg-white"
                  />
                  <div className="mt-3 max-w-xs">
                    <Field label="Priority">
                      <Select value={item.priority} onValueChange={(value) => updatePlannedItem(item.id, { priority: value })}>
                        <SelectTrigger className="w-full bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{["low", "medium", "high", "critical"].map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Field label="Priority" required>
            <Select name="priority" value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{["low", "medium", "high", "critical"].map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Current status" required>
            <Select name="status" value={statusValue} onValueChange={setStatusValue}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{reportStatuses.map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Blockers or showstoppers" wide><Textarea name="blockers" rows={3} value={draftFields.blockers} onChange={(event) => updateDraftField("blockers", event.target.value)} /></Field>
          <Field label="Support needed (Optional)"><Textarea name="supportNeeded" rows={3} value={draftFields.supportNeeded} onChange={(event) => updateDraftField("supportNeeded", event.target.value)} /></Field>
          <Field label="Decisions needed (Optional)"><Textarea name="decisionsNeeded" rows={3} value={draftFields.decisionsNeeded} onChange={(event) => updateDraftField("decisionsNeeded", event.target.value)} /></Field>
          <Field label="Documentation links (Optional)" wide><Input name="documentationLinks" type="url" placeholder="https://docs.google.com/..." value={draftFields.documentationLinks} onChange={(event) => updateDraftField("documentationLinks", event.target.value)} /></Field>
          <Field label="Additional notes (Optional)" wide><Textarea name="additionalNotes" rows={3} value={draftFields.additionalNotes} onChange={(event) => updateDraftField("additionalNotes", event.target.value)} /></Field>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t bg-[#fafbfe] p-5 sm:flex-row sm:justify-end md:px-7">
          <Button type="button" variant="outline" disabled={saving} onClick={(event) => {
            const form = event.currentTarget.closest("form");
            if (form) void submit({ currentTarget: form, preventDefault() {} } as React.FormEvent<HTMLFormElement>, "draft");
          }} className="rounded-xl bg-white">Save draft</Button>
          <Button type="submit" disabled={saving} className="rounded-xl bg-[#3d3a82]">{saving ? "Saving..." : "Submit report"}<Check className="size-4" /></Button>
        </div>
      </form>
    </div>
  );
}

function ReportsView({
  reports,
  title,
  initialSearch,
  onSelect,
}: {
  reports: Report[];
  title: string;
  initialSearch: string;
  onSelect: (report: Report) => void;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [project, setProject] = useState("all");
  const [submittedDate, setSubmittedDate] = useState("");
  const owners = Array.from(new Map(reports.map((report) => [report.user_id, report.owner_name])).entries())
    .sort((left, right) => left[1].localeCompare(right[1]));
  const projects = Array.from(new Map(reports.map((report) => [report.project_id, report.project_name])).entries())
    .sort((left, right) => left[1].localeCompare(right[1]));
  const filtered = reports.filter((report) =>
    (type === "all" || report.report_type === type) &&
    (status === "all" || report.status === status) &&
    (owner === "all" || report.user_id === owner) &&
    (project === "all" || report.project_id === project) &&
    (!submittedDate || reportSubmittedDateInputValue(report) === submittedDate) &&
    `${report.owner_name} ${report.project_name} ${report.period_label} ${report.completed_work} ${report.blockers}`.toLowerCase().includes(search.toLowerCase()),
  );
  const filtersApplied = Boolean(search || type !== "all" || status !== "all" || owner !== "all" || project !== "all" || submittedDate);

  function clearFilters() {
    setSearch("");
    setType("all");
    setStatus("all");
    setOwner("all");
    setProject("all");
    setSubmittedDate("");
  }

  return (
    <>
      <PageHeader eyebrow="Report history" title={title} copy="Search, filter, and review structured updates across the work you can access." />
      <div className="mb-4 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_160px_170px_180px_180px_170px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search reports or blockers..." />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All report types</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {reportStatuses.map((value) => <SelectItem value={value} key={value}>{titleCase(value)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {owners.map(([id, name]) => <SelectItem value={id} key={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map(([id, name]) => <SelectItem value={id} key={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          aria-label="Date submitted"
          type="date"
          value={submittedDate}
          max={todayInputValue()}
          onChange={(event) => setSubmittedDate(event.target.value)}
        />
        <Button type="button" variant="outline" disabled={!filtersApplied} onClick={clearFilters} className="rounded-xl bg-white">
          Clear
        </Button>
      </div>
      {filtered.length ? <Panel><ReportTable reports={filtered} onSelect={onSelect} /></Panel> : <EmptyState title="No matching reports" copy="Try changing your search or filters." />}
    </>
  );
}

function GenerateReport({
  reports,
  projects,
  currentUser,
  canAggregate,
}: {
  reports: Report[];
  projects: Project[];
  currentUser: User;
  canAggregate: boolean;
}) {
  const [scope, setScope] = useState(canAggregate ? "team_weekly" : "own_weekly");
  const [project, setProject] = useState("all");
  const [generated, setGenerated] = useState(false);
  const [dateRange, setDateRange] = useState(weekRange());
  const [options, setOptions] = useState({ blockers: true, priorities: true, decisions: true, links: true });
  const sourceReports = canAggregate ? reports : reports.filter((report) => report.user_id === currentUser.id);
  const availableProjectIds = new Set(sourceReports.map((report) => report.project_id));
  const availableProjects = projects.filter((item) => availableProjectIds.has(item.id));
  const selected = sourceReports.filter((report) =>
    (project === "all" || report.project_id === project) &&
    (scope === "team_weekly" || scope === "own_weekly" ? report.report_type === "weekly" : scope === "team_monthly" || scope === "own_monthly" ? report.report_type === "monthly" : scope === "blockers" || scope === "own_blockers" ? !!report.blockers : true),
  );
  const reportTitle = reportTitles[scope] ?? titleCase(scope);
  const projectName = project === "all" ? "All projects" : projects.find((item) => item.id === project)?.name ?? "Selected project";
  const copyText = [
    reportTitle,
    `${dateRange} - ${projectName}`,
    "",
    "Completed Work",
    ...selected.map((report) => `- ${report.completed_work}`),
    ...(options.priorities ? ["", "Priorities", ...selected.map((report) => `- ${report.owner_name}: ${titleCase(report.priority)}`)] : []),
    ...(options.blockers ? ["", "Blockers", ...selected.filter((report) => report.blockers).map((report) => `- ${report.blockers}`)] : []),
    ...(options.decisions ? ["", "Decisions Needed", ...selected.filter((report) => report.decisions_needed).map((report) => `- ${report.decisions_needed}`)] : []),
    ...(options.links ? ["", "Documentation", ...selected.filter((report) => report.documentation_links).map((report) => `- ${report.documentation_links}`)] : []),
  ].join("\n");

  function exportCsv() {
    const rows = [["Owner", "Project", "Type", "Status", "Priority", "Completed work"], ...selected.map((report) => [report.owner_name, report.project_name, report.report_type, report.status, report.priority, report.completed_work])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        eyebrow={canAggregate ? "Leadership-ready outputs" : "Personal reporting"}
        title={canAggregate ? "Generate report" : "Generate my report"}
        copy={canAggregate ? "Turn structured updates into a clean team, project, or leadership summary." : "Create a polished summary from your own submitted reports."}
      />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="h-fit rounded-2xl border bg-white p-5">
          <div className="space-y-5">
            <Field label="Report format">
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {canAggregate ? (
                    <>
                      <SelectItem value="team_weekly">Weekly team report</SelectItem>
                      <SelectItem value="team_monthly">Monthly team report</SelectItem>
                      <SelectItem value="leadership">Leadership summary</SelectItem>
                      <SelectItem value="blockers">Blockers report</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="own_weekly">My weekly report</SelectItem>
                      <SelectItem value="own_monthly">My monthly report</SelectItem>
                      <SelectItem value="own_blockers">My blockers report</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Project">
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {(canAggregate ? projects : availableProjects).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date range"><Input value={dateRange} onChange={(event) => setDateRange(event.target.value)} /></Field>
            <div className="space-y-3">
              <Option label="Include blockers" checked={options.blockers} onCheckedChange={(checked) => setOptions((current) => ({ ...current, blockers: checked }))} />
              <Option label="Include priorities" checked={options.priorities} onCheckedChange={(checked) => setOptions((current) => ({ ...current, priorities: checked }))} />
              <Option label="Include decisions needed" checked={options.decisions} onCheckedChange={(checked) => setOptions((current) => ({ ...current, decisions: checked }))} />
              <Option label="Include documentation links" checked={options.links} onCheckedChange={(checked) => setOptions((current) => ({ ...current, links: checked }))} />
            </div>
            <Button onClick={() => setGenerated(true)} className="w-full rounded-xl bg-[#3d3a82]">
              <Sparkles className="size-4" />
              Generate report
            </Button>
          </div>
        </div>
        <div className="min-h-[560px] rounded-2xl border bg-white p-6 md:p-9">
          {generated ? (
            <div className="print-area">
              <div className="mb-8 flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-start">
                <div>
                  <Badge className="mb-3 bg-[#eeeffb] text-[#504c9c] hover:bg-[#eeeffb]">{reportTitle}</Badge>
                  <h2 className="text-2xl font-extrabold tracking-tight">{reportTitle}</h2>
                  <p className="mt-1 text-sm text-slate-500">{dateRange} - {projectName} - {selected.length} source reports</p>
                </div>
                <div className="flex gap-1 print:hidden">
                  <Button variant="outline" size="icon" onClick={() => void copyToClipboard(copyText)}><Clipboard className="size-4" /></Button>
                  <Button variant="outline" size="icon" onClick={exportCsv}><ArrowDownToLine className="size-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="size-4" /></Button>
                </div>
              </div>
              {selected.length ? (
                <>
                  <ReportSection title="Executive summary">
                    <p>{canAggregate ? "The team" : currentUser.full_name} progressed work across {new Set(selected.map((report) => report.project_id)).size} projects. {selected.filter((report) => report.status === "completed").length} updates are complete, while {selected.filter((report) => report.blockers).length} active blockers require follow-up.</p>
                  </ReportSection>
                  <ReportSection title="Completed work">{selected.map((report) => <SummaryItem key={report.id} name={report.project_name} text={report.completed_work} />)}</ReportSection>
                  {options.priorities && <ReportSection title="Priorities">{selected.map((report) => <SummaryItem key={`${report.id}-priority`} name={report.owner_name} text={titleCase(report.priority)} />)}</ReportSection>}
                  {options.blockers && <ReportSection title="Blockers">{selected.filter((report) => report.blockers).map((report) => <SummaryItem key={`${report.id}-blocker`} name={report.project_name} text={report.blockers} critical />)}</ReportSection>}
                  {options.decisions && <ReportSection title="Decisions needed">{selected.filter((report) => report.decisions_needed).map((report) => <SummaryItem key={`${report.id}-decision`} name={report.project_name} text={report.decisions_needed} />)}</ReportSection>}
                  {options.links && <ReportSection title="Documentation">{selected.filter((report) => report.documentation_links).map((report) => <SummaryItem key={`${report.id}-link`} name={report.project_name} text={report.documentation_links} />)}</ReportSection>}
                </>
              ) : (
                <InlineEmpty title="No source reports" copy="The selected scope has no live report submissions yet." />
              )}
            </div>
          ) : (
            <div className="grid min-h-[500px] place-items-center text-center">
              <div>
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eeeffb] text-[#5652a3]"><Sparkles className="size-6" /></div>
                <h2 className="mt-4 font-bold">Your generated report will appear here</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Choose the scope and content to create a polished report preview.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BlockersView({ reports, onSelect }: { reports: Report[]; onSelect: (report: Report) => void }) {
  const blockers = reports.filter((report) => report.blockers && report.status !== "completed");
  return (
    <>
      <PageHeader eyebrow="Cross-team risks" title="Blockers dashboard" copy="Make dependencies, decisions, and support needs impossible to miss." />
      {blockers.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {blockers.map((report) => (
            <button key={report.id} type="button" onClick={() => onSelect(report)} className="rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle className="size-5" /></div>
                <Badge variant="outline" className={report.priority === "critical" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{titleCase(report.priority)}</Badge>
              </div>
              <h3 className="mt-4 font-bold text-[#201e38]">{report.project_name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{report.blockers}</p>
              <div className="mt-4 grid gap-3 border-t pt-4 text-xs sm:grid-cols-2">
                <div><span className="text-slate-400">Owner</span><p className="mt-1 font-semibold">{report.owner_name}</p></div>
                <div><span className="text-slate-400">Support needed</span><p className="mt-1 font-semibold">{report.support_needed || "Not specified"}</p></div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No active blockers" copy="When a live report includes a blocker, it will surface here." />
      )}
    </>
  );
}

function ProjectsView({
  projects,
  reports,
  isAdmin,
  onUpdated,
}: {
  projects: Project[];
  reports: Report[];
  isAdmin: boolean;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  function openProject(project?: Project) {
    setEditing(project ?? null);
    setOpen(true);
  }

  async function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await postAction({ action: editing ? "update_project" : "add_project", projectId: editing?.id, ...values });
      toast.success(editing ? "Project updated" : "Project created");
      setOpen(false);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Project could not be saved");
    }
  }

  async function deleteProject(project: Project) {
    try {
      await postAction({ action: "delete_project", projectId: project.id });
      toast.success("Project deleted");
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Project could not be deleted");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Portfolio view"
        title="Projects"
        copy="See reporting activity, ownership, and health across Trivestack initiatives."
        actions={isAdmin && <Button onClick={() => openProject()} className="rounded-xl bg-[#3d3a82]"><Plus className="size-4" />Add project</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const linked = reports.filter((report) => report.project_id === project.id);
          const blocked = linked.some((report) => report.blockers && report.status !== "completed");
          return (
            <article key={project.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="grid size-10 place-items-center rounded-xl bg-[#eeeffb] text-[#5652a3]"><FolderKanban className="size-5" /></div>
                <Badge variant="outline" className={project.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>{titleCase(project.status)}</Badge>
              </div>
              <h3 className="mt-4 font-bold">{project.name}</h3>
              <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{project.description || "No description yet."}</p>
              <div className="mt-5 grid gap-2 border-t pt-4 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">{Number(project.report_count)} reports</span><span className={blocked ? "font-semibold text-rose-600" : "font-semibold text-emerald-700"}>{blocked ? "Has blockers" : "On track"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Team</span><span className="font-semibold">{project.team}</span></div>
              </div>
              {isAdmin && (
                <div className="mt-4 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl bg-white" onClick={() => openProject(project)}><Edit3 className="size-4" />Edit</Button>
                  <Button type="button" variant="ghost" size="sm" className="rounded-xl text-rose-600 hover:text-rose-700" onClick={() => void deleteProject(project)}><Trash2 className="size-4" />Delete</Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit project" : "Add project"}</DialogTitle>
            <DialogDescription>{editing ? "Update the project name, team, and status." : "Create a reporting destination for a Trivestack initiative."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProject} className="mt-3 space-y-4">
            <Field label="Project name" required><Input name="name" defaultValue={editing?.name} required /></Field>
            <Field label="Description"><Textarea name="description" rows={3} defaultValue={editing?.description} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Team"><Input name="team" defaultValue={editing?.team ?? "Product"} /></Field>
              <Field label="Status">
                <Select name="status" defaultValue={editing?.status ?? "active"}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{projectStatuses.map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Button type="submit" className="w-full rounded-xl bg-[#3d3a82]">{editing ? "Save project" : "Create project"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamView({ users, reports }: { users: User[]; reports: Report[] }) {
  return (
    <>
      <PageHeader eyebrow="Submission tracking" title="Team" copy="Know who submitted, who is pending, and where follow-up is needed." />
      {users.length ? (
        <Panel>
          <Table>
            <TableHeader><TableRow><TableHead>Team member</TableHead><TableHead>Role</TableHead><TableHead>Team</TableHead><TableHead>Last report</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((user) => {
                const last = reports.find((report) => report.user_id === user.id);
                return (
                  <TableRow key={user.id}>
                    <TableCell><div className="flex items-center gap-3"><Avatar name={user.full_name} /><div><p className="font-semibold">{user.full_name}</p><p className="text-xs text-slate-400">{user.job_title}</p></div></div></TableCell>
                    <TableCell>{titleCase(user.role)}</TableCell>
                    <TableCell>{user.team}</TableCell>
                    <TableCell>{last ? reportDisplayDate(last) : "No report"}</TableCell>
                    <TableCell>{last ? <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="size-3" />Submitted</Badge> : <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50"><CircleDot className="size-3" />Pending</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      ) : (
        <EmptyState title="No team members yet" copy="Invite team members from Users & invites." />
      )}
    </>
  );
}

function UsersView({
  users,
  invitations,
  currentId,
  onUpdated,
}: {
  users: User[];
  invitations: Invitation[];
  currentId: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  async function updateRole(userId: string, role: string) {
    try {
      await postAction({ action: "user_role", userId, role });
      toast.success("Role updated");
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role could not be updated");
    }
  }

  async function updateStatus(userId: string, status: string) {
    try {
      await postAction({ action: "user_status", userId, status });
      toast.success("User status updated");
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status could not be updated");
    }
  }

  async function inviteUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const result = await postAction({ action: "invite_user", ...values });
      setInviteLink(result.inviteUrl);
      toast.success("Invite created");
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invite could not be created");
    }
  }

  async function revokeInvite(inviteId: string) {
    try {
      await postAction({ action: "revoke_invite", inviteId });
      toast.success("Invite revoked");
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invite could not be revoked");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Access control"
        title="Users & invites"
        copy="Invite-only signup keeps the workspace controlled while still making onboarding easy."
        actions={<Button onClick={() => { setInviteLink(""); setOpen(true); }} className="rounded-xl bg-[#3d3a82]"><Mail className="size-4" />Invite member</Button>}
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Panel title="Active users" copy="People who can access the workspace.">
          {users.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Team</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell><div className="flex items-center gap-3"><Avatar name={user.full_name} /><div><p className="font-semibold">{user.full_name}</p><p className="text-xs text-slate-400">{user.email}</p></div></div></TableCell>
                    <TableCell>{user.team}</TableCell>
                    <TableCell>
                      <Select value={user.role} disabled={user.id === currentId} onValueChange={(role) => void updateRole(user.id, role)}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{roles.map((role) => <SelectItem key={role} value={role}>{titleCase(role)}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.id === currentId ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Active</Badge>
                      ) : (
                        <Select value={user.status} onValueChange={(status) => void updateStatus(user.id, status)}>
                          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <InlineEmpty title="No active users" copy="Invite your team to start collecting live reports." />
          )}
        </Panel>
        <Panel title="Pending invitations" copy="Share links or open a prefilled email.">
          {invitations.length ? (
            <div className="divide-y">
              {invitations.map((invite) => (
                <div key={invite.id} className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{invite.email}</p>
                      <p className="text-xs text-slate-500">{titleCase(invite.role)} - {invite.team}</p>
                    </div>
                    <StatusBadge status={invite.status} />
                  </div>
                  {invite.status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl bg-white" onClick={() => void copyToClipboard(invite.invite_url)}><Clipboard className="size-4" />Copy link</Button>
                      <Button variant="outline" size="sm" className="rounded-xl bg-white" asChild>
                        <a href={`mailto:${invite.email}?subject=${encodeURIComponent("Trivestack workspace invite")}&body=${encodeURIComponent(`You have been invited to join the Trivestack Product Team Hub.\n\nSign up here: ${invite.invite_url}`)}`}>
                          <Mail className="size-4" />Email
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-xl text-rose-600" onClick={() => void revokeInvite(invite.id)}><XCircle className="size-4" />Revoke</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <InlineEmpty title="No invitations yet" copy="Use Invite member to generate the first signup link." />
          )}
        </Panel>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>Create an invite link for a Trivestack email address.</DialogDescription>
          </DialogHeader>
          <form onSubmit={inviteUser} className="mt-3 space-y-4">
            <Field label="Email" required><Input name="email" type="email" placeholder="name@trivestack.com" required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Team"><Input name="team" defaultValue="Product" /></Field>
              <Field label="Job title"><Input name="jobTitle" defaultValue="Team Member" /></Field>
            </div>
            <Field label="Role">
              <Select name="role" defaultValue="team_member">
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map((role) => <SelectItem key={role} value={role}>{titleCase(role)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Button type="submit" className="w-full rounded-xl bg-[#3d3a82]">Create invite</Button>
          </form>
          {inviteLink && (
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Invite link</p>
              <div className="mt-2 flex gap-2">
                <Input readOnly value={inviteLink} className="bg-white" />
                <Button type="button" size="icon" variant="outline" onClick={() => void copyToClipboard(inviteLink)}><Clipboard className="size-4" /></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SettingsView({ settings, onSaved }: { settings: WorkspaceSettings; onSaved: () => void }) {
  const [inAppReminders, setInAppReminders] = useState(settings.inAppReminders !== "false");
  const [emailReminders, setEmailReminders] = useState(settings.emailReminders !== "false");
  const [lateSubmissionAlerts, setLateSubmissionAlerts] = useState(settings.lateSubmissionAlerts !== "false");

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await postAction({
        action: "update_settings",
        ...values,
        inAppReminders: String(inAppReminders),
        emailReminders: String(emailReminders),
        lateSubmissionAlerts: String(lateSubmissionAlerts),
      });
      toast.success("Settings saved");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Settings could not be saved");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Reporting rules" title="Settings" copy="Keep reporting expectations simple, consistent, and visible to everyone." />
      <form onSubmit={saveSettings} className="grid gap-5 lg:grid-cols-2">
        <SettingsCard title="Reporting schedule" copy="Set when each structured update is expected.">
          <Field label="Daily reminder time"><Input name="dailyReminderTime" defaultValue={settings.dailyReminderTime ?? "5:00 PM"} /></Field>
          <Field label="Weekly report due day">
            <Select name="weeklyDueDay" defaultValue={settings.weeklyDueDay ?? "friday"}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Monthly report due"><Input name="monthlyDue" defaultValue={settings.monthlyDue ?? "Last working day"} /></Field>
        </SettingsCard>
        <SettingsCard title="Notifications" copy="Choose the lightweight reminders the team receives.">
          <Toggle label="In-app reminders" copy="Show due and overdue reminders inside the hub." checked={inAppReminders} onCheckedChange={setInAppReminders} />
          <Toggle label="Email reminders" copy="Use the configured invite/reminder email workflow." checked={emailReminders} onCheckedChange={setEmailReminders} />
          <Toggle label="Late submission alerts" copy="Notify the Product Manager when a report is overdue." checked={lateSubmissionAlerts} onCheckedChange={setLateSubmissionAlerts} />
          <Button type="submit" className="w-full rounded-xl bg-[#3d3a82]">Save settings</Button>
        </SettingsCard>
      </form>
    </>
  );
}

function ProfileDialog({
  open,
  user,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  user: User;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await postAction({ action: "update_profile", ...values });
      toast.success("Profile updated");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be updated");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Keep your report ownership and team details current.</DialogDescription>
        </DialogHeader>
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Full name" required><Input name="fullName" defaultValue={user.full_name} required /></Field>
          <Field label="Email"><Input value={user.email} disabled /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Team"><Input name="team" defaultValue={user.team} /></Field>
            <Field label="Job title"><Input name="jobTitle" defaultValue={user.job_title} /></Field>
          </div>
          <div className="rounded-xl border bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-[#201e38]">Change password</h3>
            <p className="mt-1 text-xs text-slate-500">Leave these blank to keep your current password.</p>
            <div className="mt-4 grid gap-4">
              <Field label="Current password"><Input name="currentPassword" type="password" autoComplete="current-password" /></Field>
              <Field label="New password"><Input name="newPassword" type="password" autoComplete="new-password" minLength={8} /></Field>
              <Field label="Confirm new password"><Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#3d3a82]">Save profile</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReportTable({ reports, onSelect }: { reports: Report[]; onSelect: (report: Report) => void }) {
  return (
    <Table>
      <TableHeader><TableRow className="bg-[#fafbfe] hover:bg-[#fafbfe]"><TableHead className="pl-6">Owner / project</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Priority</TableHead><TableHead className="hidden pr-6 text-right lg:table-cell">Submitted</TableHead></TableRow></TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id} onClick={() => onSelect(report)} className="cursor-pointer">
            <TableCell className="pl-6"><div className="flex items-center gap-3"><Avatar name={report.owner_name} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{report.owner_name}</p><p className="max-w-[240px] truncate text-xs text-slate-400">{report.project_name}</p></div></div></TableCell>
            <TableCell className="text-xs font-medium">{titleCase(report.report_type)}</TableCell>
            <TableCell><StatusBadge status={report.status} /></TableCell>
            <TableCell className="hidden md:table-cell"><span className={report.priority === "critical" ? "font-semibold text-rose-600" : report.priority === "high" ? "font-semibold text-orange-600" : "text-slate-500"}>{titleCase(report.priority)}</span></TableCell>
            <TableCell className="hidden pr-6 text-right text-xs text-slate-400 lg:table-cell">{reportDisplayDate(report)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReportDialog({ report, onOpenChange }: { report: Report | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!report} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        {report && (
          <>
            <DialogHeader>
              <div className="mb-3 flex items-center gap-2">
                <Badge className="bg-[#eeeffb] text-[#504c9c] hover:bg-[#eeeffb]">{titleCase(report.report_type)}</Badge>
                <StatusBadge status={report.status} />
              </div>
              <DialogTitle className="text-xl">{report.project_name}</DialogTitle>
              <DialogDescription>{report.owner_name} - {report.period_label}</DialogDescription>
            </DialogHeader>
            <div className="mt-3 grid gap-5">
              <Detail label="Completed work" value={report.completed_work} />
              <Detail label="Work in progress" value={report.work_in_progress} />
              <PlannedWorkDetail report={report} />
              {report.blockers && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-rose-600">Blocker</p><p className="mt-2 text-sm leading-6 text-rose-900">{report.blockers}</p></div>}
              <div className="grid gap-4 sm:grid-cols-2"><Detail label="Support needed" value={report.support_needed} /><Detail label="Decision needed" value={report.decisions_needed} /></div>
              {report.documentation_links && <a className="flex items-center gap-2 text-sm font-semibold text-[#5652a3]" href={report.documentation_links} target="_blank" rel="noreferrer"><Link2 className="size-4" />Open documentation</a>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PageHeader({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: React.ReactNode }) {
  return (
    <section className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#5c58a8]"><CalendarDays className="size-4" />{eyebrow}</div>
        <h1 className="text-2xl font-extrabold tracking-[-.03em] text-[#17152d] md:text-[32px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{copy}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

function Panel({ title, copy, action, children }: { title?: string; copy?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_10px_34px_rgba(39,42,70,.045)]">
      {title && <div className="flex items-center justify-between border-b px-5 py-4 md:px-6"><div><h2 className="font-bold tracking-tight text-[#201e38]">{title}</h2>{copy && <p className="mt-0.5 text-xs text-slate-500">{copy}</p>}</div>{action}</div>}
      {children}
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon, tone, progress }: { label: string; value: string; note: string; icon: typeof FileText; tone: "indigo" | "blue" | "coral" | "amber"; progress?: number }) {
  const styles = { indigo: "bg-[#eeeffb] text-[#504c9c]", blue: "bg-sky-50 text-sky-700", coral: "bg-rose-50 text-rose-600", amber: "bg-amber-50 text-amber-700" }[tone];
  return <article className="rounded-2xl border bg-white p-5 shadow-[0_10px_34px_rgba(39,42,70,.04)]"><div className="flex items-start justify-between"><p className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</p><div className={`grid size-9 place-items-center rounded-xl ${styles}`}><Icon className="size-[18px]" /></div></div><p className="mt-1 text-[28px] font-extrabold tracking-[-.04em] text-[#1d1b34]">{value}</p>{progress !== undefined && <Progress value={progress} className="mt-2 h-1.5 bg-indigo-50 [&>div]:bg-[#6d68c5]" />}<p className="mt-2 text-xs text-slate-400">{note}</p></article>;
}

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={`grid content-start gap-2 text-sm font-semibold text-[#312e4c] ${wide ? "md:col-span-2" : ""}`}><span>{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>{children}</label>;
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] ${statusStyle[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}><CircleDot className="size-2.5" />{titleCase(status)}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    low: "border-slate-200 bg-slate-50 text-slate-600",
    medium: "border-blue-200 bg-blue-50 text-blue-700",
    high: "border-orange-200 bg-orange-50 text-orange-700",
    critical: "border-rose-200 bg-rose-50 text-rose-700",
  };
  return <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] ${styles[priority] ?? styles.medium}`}>{titleCase(priority)}</Badge>;
}

function Avatar({ name }: { name: string }) {
  return <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eeeffb] text-[11px] font-bold text-[#4b478f]">{initials(name)}</div>;
}

function Detail({ label, value }: { label: string; value?: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">{value || "Not provided"}</p></div>;
}

function PlannedWorkDetail({ report }: { report: Report }) {
  const items = plannedItemsFromReport(report);
  if (!items.length) return <Detail label="Planned next" value="" />;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Planned next</p>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.id}-${index}`} className="rounded-xl border bg-[#fafbfe] p-3">
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{item.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PriorityBadge priority={item.priority} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-white p-8 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><FileText className="size-5" /></div><h2 className="mt-4 font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{copy}</p></div></div>;
}

function InlineEmpty({ title, copy }: { title: string; copy: string }) {
  return <div className="grid min-h-56 place-items-center p-8 text-center"><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{copy}</p></div></div>;
}

function LoadingView() {
  return <div className="space-y-5"><Skeleton className="h-24 w-full max-w-xl" /><div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((value) => <Skeleton key={value} className="h-36 rounded-2xl" />)}</div><Skeleton className="h-96 rounded-2xl" /></div>;
}

function Option({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />{label}</label>;
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-7"><h3 className="mb-3 text-sm font-extrabold uppercase tracking-[.08em] text-[#4f4b96]">{title}</h3><div className="space-y-3 text-sm leading-6 text-slate-700">{children}</div></section>;
}

function SummaryItem({ name, text, critical }: { name: string; text: string; critical?: boolean }) {
  return <div className={`rounded-xl border p-4 ${critical ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-[#fafbfe]"}`}><p className="text-xs font-bold text-slate-500">{name}</p><p className="mt-1">{text}</p></div>;
}

function SettingsCard({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-white p-5 md:p-6"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{copy}</p><div className="mt-6 space-y-5">{children}</div></div>;
}

function Toggle({ label, copy, checked, onCheckedChange }: { label: string; copy: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-start justify-between gap-4 border-b pb-4 last:border-0"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} /></div>;
}
