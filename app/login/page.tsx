"use client";

import { useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";

export default function LoginPage() {
  const [saving, setSaving] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "login", ...values }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Login failed");
      toast.success("Logged in");
      window.location.href = "/";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f6fb] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-[0_18px_48px_rgba(39,42,70,.08)]">
        <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#5652a3]">
          <ArrowLeft className="size-4" />
          Back to workspace
        </a>
        <div className="grid size-12 place-items-center rounded-2xl bg-[#eeeffb] text-[#5652a3]">
          <LogIn className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#17152d]">Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use an active Trivestack workspace account. New members must first accept an invite link from the super admin.
        </p>
        <form onSubmit={login} className="mt-6 space-y-4">
          <label className="grid gap-2 text-sm font-semibold text-[#312e4c]">
            Email
            <Input name="email" type="email" placeholder="name@trivestack.com" required />
          </label>
          <Button type="submit" disabled={saving} className="w-full rounded-xl bg-[#3d3a82]">
            <LogIn className="size-4" />
            {saving ? "Logging in..." : "Login"}
          </Button>
        </form>
      </section>
      <Toaster richColors position="top-right" />
    </main>
  );
}
