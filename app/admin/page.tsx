"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "brent@kevria.com";

type User = {
  id: string;
  email: string;
  created_at: string;
  paid: boolean;
  subscription_status: string | null;
  welcome_sent_at: string | null;
  followup1_sent_at: string | null;
  followup2_sent_at: string | null;
  last_active_at: string | null;
  last_sign_in_at: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return router.push("/login");
      if (session.user.email !== ADMIN_EMAIL) return router.push("/dashboard");
      await fetchUsers(session.access_token);
    });
  }, [router]);

  async function fetchUsers(token: string) {
    setLoading(true);
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setUsers(data.users);
    }
    setLoading(false);
  }

  async function togglePaid(userId: string, currentPaid: boolean) {
    setUpdating(userId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, paid: !currentPaid }),
    });

    const data = await res.json();
    if (data.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, paid: !currentPaid, subscription_status: !currentPaid ? "staff" : "canceled" }
            : u
        )
      );
    } else {
      alert("Failed to update: " + data.error);
    }
    setUpdating(null);
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    if (data.success) {
      setInviteMsg({ type: "success", text: `Invite sent to ${inviteEmail}` });
      setInviteEmail("");
      await fetchUsers(session.access_token);
    } else {
      setInviteMsg({ type: "error", text: data.error });
    }
    setInviting(false);
  }

  async function sendEmail(userId: string, type: "welcome" | "followup1" | "followup2") {
    setSendingEmail(`${userId}-${type}`);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/admin/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, type }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchUsers(session.access_token);
    } else {
      alert("Failed: " + data.error);
    }
    setSendingEmail(null);
  }

  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const s = {
    page: {
      minHeight: "100vh",
      background: "#f8fafc",
      color: "#0f172a",
      fontFamily: "Arial, Helvetica, sans-serif",
      padding: "32px 24px",
    } as React.CSSProperties,
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "32px",
      flexWrap: "wrap" as const,
      gap: "16px",
    },
    title: {
      fontSize: "24px",
      fontWeight: 700,
      color: "#d4a843",
      margin: 0,
    },
    backBtn: {
      background: "transparent",
      border: "1px solid #cbd5e1",
      color: "#334155",
      padding: "8px 16px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
    },
    search: {
      width: "100%",
      maxWidth: "400px",
      padding: "10px 14px",
      background: "#f1f5f9",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      color: "#0f172a",
      fontSize: "14px",
      marginBottom: "24px",
      outline: "none",
    },
    stats: {
      display: "flex",
      gap: "16px",
      marginBottom: "24px",
      flexWrap: "wrap" as const,
    },
    statCard: {
      background: "#f1f5f9",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      padding: "16px 24px",
      minWidth: "140px",
    },
    statLabel: { fontSize: "12px", color: "#64748b", marginBottom: "4px" },
    statValue: { fontSize: "24px", fontWeight: 700, color: "#d4a843" },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      background: "#f1f5f9",
      borderRadius: "12px",
      overflow: "hidden",
    },
    th: {
      padding: "14px 16px",
      textAlign: "left" as const,
      fontSize: "12px",
      color: "#64748b",
      fontWeight: 600,
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      borderBottom: "1px solid #e2e8f0",
      background: "#f8fafc",
    },
    td: {
      padding: "14px 16px",
      fontSize: "14px",
      borderBottom: "1px solid #e2e8f0",
    },
    badge: (paid: boolean, status: string | null) => ({
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 600,
      background: paid ? "#f0fdf4" : status === "staff" ? "#f1f5f9" : "#fef2f2",
      color: paid ? "#4caf50" : "#94a3b8",
      border: `1px solid ${paid ? "#4caf50" : "#64748b"}`,
    }),
    toggleBtn: (paid: boolean, disabled: boolean) => ({
      padding: "6px 14px",
      borderRadius: "6px",
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "13px",
      fontWeight: 600,
      opacity: disabled ? 0.5 : 1,
      background: paid ? "#fef2f2" : "#f0fdf4",
      color: paid ? "#dc2626" : "#4caf50",
      transition: "opacity 0.2s",
    }),
  };

  const totalUsers = users.length;
  const paidUsers = users.filter((u) => u.paid).length;
  const staffUsers = users.filter((u) => u.subscription_status === "staff").length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeUsers = users.filter((u) => u.last_active_at && new Date(u.last_active_at).getTime() >= weekAgo).length;
  const recordedUsers = users.filter((u) => u.last_active_at).length;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Admin — User Management</h1>
        <button style={s.backBtn} onClick={() => router.push("/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #dc2626", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      <div style={s.stats}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Users</div>
          <div style={s.statValue}>{totalUsers}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Paid Active</div>
          <div style={s.statValue}>{paidUsers}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Staff Accounts</div>
          <div style={s.statValue}>{staffUsers}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Active in app (last 7d)</div>
          <div style={s.statValue}>{activeUsers}</div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{recordedUsers} of {totalUsers} tracked so far</div>
        </div>
      </div>

      {/* Invite form */}
      <form onSubmit={inviteUser} style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" as const }}>
        <input
          type="email"
          required
          placeholder="staff@email.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          style={{ ...s.search, marginBottom: 0, flex: 1, minWidth: "220px" }}
        />
        <button
          type="submit"
          disabled={inviting}
          style={{
            padding: "10px 20px",
            background: inviting ? "#e2e8f0" : "#d4a843",
            color: inviting ? "#64748b" : "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: inviting ? "not-allowed" : "pointer",
          }}
        >
          {inviting ? "Sending..." : "Invite Staff"}
        </button>
      </form>
      {inviteMsg && (
        <div style={{
          marginBottom: "16px",
          padding: "10px 16px",
          borderRadius: "8px",
          fontSize: "14px",
          background: inviteMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${inviteMsg.type === "success" ? "#4caf50" : "#dc2626"}`,
          color: inviteMsg.type === "success" ? "#4caf50" : "#fca5a5",
        }}>
          {inviteMsg.text}
        </div>
      )}

      <input
        style={s.search}
        placeholder="Search by email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div style={{ textAlign: "center", color: "#64748b", padding: "48px" }}>Loading users...</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Email</th>
              <th style={s.th}>Last Active</th>
              <th style={s.th}>Joined</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Subscription</th>
              <th style={s.th}>Emails Sent</th>
              <th style={s.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#64748b", padding: "48px" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} style={{ background: u.email === ADMIN_EMAIL ? "#ffffff" : "transparent" }}>
                  <td style={s.td}>
                    <span style={{ color: "#0f172a" }}>{u.email}</span>
                    {u.email === ADMIN_EMAIL && (
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "#d4a843", fontWeight: 600 }}>YOU</span>
                    )}
                  </td>
                  {(() => {
                    // Prefer real in-app activity; only fall back to sign-in, clearly tagged.
                    const isReal = !!u.last_active_at;
                    const ts = u.last_active_at ?? u.last_sign_in_at;
                    const recent = ts ? new Date(ts).getTime() >= weekAgo : false;
                    return (
                      <td
                        style={{
                          ...s.td,
                          fontSize: "13px",
                          fontWeight: isReal && recent ? 600 : 400,
                          color: !ts ? "#94a3b8" : isReal ? (recent ? "#4caf50" : "#64748b") : "#94a3b8",
                        }}
                        title={
                          ts
                            ? `${isReal ? "Last opened the app" : "Last fresh sign-in (Supabase Auth — not updated on silent session refresh, so may understate activity)"}: ${new Date(ts).toLocaleString("en-AU")}`
                            : "No activity or sign-in recorded"
                        }
                      >
                        {ts ? timeAgo(ts) : "Never"}
                        {ts && !isReal && (
                          <span style={{ marginLeft: "6px", fontSize: "11px", color: "#cbd5e1", fontStyle: "italic" }}>login</span>
                        )}
                      </td>
                    );
                  })()}
                  <td style={{ ...s.td, color: "#64748b" }}>
                    {new Date(u.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={s.td}>
                    <span style={s.badge(u.paid, u.subscription_status)}>
                      {u.paid ? "Paid" : "Free"}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: "#64748b", fontSize: "13px" }}>
                    {u.subscription_status ?? "—"}
                  </td>
                  <td style={{ ...s.td, fontSize: "12px" }}>
                    {u.email === ADMIN_EMAIL ? (
                      <span style={{ color: "#64748b" }}>—</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {(["welcome", "followup1", "followup2"] as const).map((type) => {
                          const sentAt = u[`${type}_sent_at` as keyof User] as string | null;
                          const label = type === "welcome" ? "Welcome" : type === "followup1" ? "Day 3" : "Day 7";
                          const isSending = sendingEmail === `${u.id}-${type}`;
                          return (
                            <div key={type} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ color: sentAt ? "#4caf50" : "#64748b", width: "6px" }}>{sentAt ? "✓" : "·"}</span>
                              <span style={{ color: sentAt ? "#64748b" : "#0f172a", minWidth: "52px" }}>{label}</span>
                              <button
                                onClick={() => sendEmail(u.id, type)}
                                disabled={isSending}
                                style={{
                                  padding: "2px 8px",
                                  background: "transparent",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  color: "#d4a843",
                                  cursor: isSending ? "not-allowed" : "pointer",
                                  fontSize: "11px",
                                  opacity: isSending ? 0.5 : 1,
                                }}
                              >
                                {isSending ? "..." : sentAt ? "Resend" : "Send"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td style={s.td}>
                    {u.email === ADMIN_EMAIL ? (
                      <span style={{ fontSize: "12px", color: "#64748b" }}>—</span>
                    ) : (
                      <button
                        style={s.toggleBtn(u.paid, updating === u.id)}
                        disabled={updating === u.id}
                        onClick={() => togglePaid(u.id, u.paid)}
                      >
                        {updating === u.id ? "..." : u.paid ? "Revoke Access" : "Grant Access"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
