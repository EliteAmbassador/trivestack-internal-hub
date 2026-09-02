"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Invite = {
  email: string;
  role: string;
  team: string;
  job_title: string;
  status: string;
  expired: boolean;
};

const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

export function InviteSignup({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        const response = await fetch(`/api/workspace?invite=${encodeURIComponent(token)}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Invite could not be loaded");
        setInvite(payload.invite);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Invite could not be loaded");
      } finally {
        setLoading(false);
      }
    }

    void loadInvite();
  }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "accept_invite", token, ...values }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Signup failed");
      toast.success("Welcome to Trivestack");
      window.location.href = "/";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed");
      setSaving(false);
    }
  }

  const blocked = !loading && (!invite || invite.expired || invite.status !== "pending");

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-10 text-[#17152d]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-xl place-items-center">
        <div className="w-full rounded-2xl border bg-white p-6 shadow-[0_18px_48px_rgba(39,42,70,.08)] md:p-8">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-[#ff7d66] text-[#17153b]">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Trivestack</p>
              <p className="text-xs text-slate-500">Product Team Hub invite</p>
            </div>
          </div>

          {loading && <p className="mt-8 text-sm text-slate-500">Checking invite...</p>}

          {blocked && (
            <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              This invite link is invalid, expired, or already accepted.
            </div>
          )}

          {invite && !blocked && (
            <>
              <div className="mt-8">
                <Badge className="mb-3 bg-[#eeeffb] text-[#504c9c] hover:bg-[#eeeffb]">
                  {titleCase(invite.role)}
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Complete your signup</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="size-4" />
                  {invite.email}
                </p>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="grid gap-2 text-sm font-semibold">
                  Full name
                  <Input name="fullName" required placeholder="Your full name" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold">
                    Team
                    <Input name="team" defaultValue={invite.team} />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Job title
                    <Input name="jobTitle" defaultValue={invite.job_title} />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold">
                  Password
                  <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Confirm password
                  <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
                </label>
                <Button type="submit" disabled={saving} className="w-full rounded-xl bg-[#3d3a82]">
                  {saving ? "Creating account..." : "Join workspace"}
                  <CheckCircle2 className="size-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </main>
  );
}
