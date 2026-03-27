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
};

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

  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const s = {
    page: {
      minHeight: "100vh",
      background: "#1a0a2e",
      color: "#e8e0f0",
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
      border: "1px solid #4a3060",
      color: "#c8b8e0",
      padding: "8px 16px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
    },
    search: {
      width: "100%",
      maxWidth: "400px",
      padding: "10px 14px",
      background: "#2d1554",
      border: "1px solid #4a3060",
      borderRadius: "8px",
      color: "#e8e0f0",
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
      background: "#2d1554",
      border: "1px solid #4a3060",
      borderRadius: "10px",
      padding: "16px 24px",
      minWidth: "140px",
    },
    statLabel: { fontSize: "12px", color: "#9880b8", marginBottom: "4px" },
    statValue: { fontSize: "24px", fontWeight: 700, color: "#d4a843" },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      background: "#2d1554",
      borderRadius: "12px",
      overflow: "hidden",
    },
    th: {
      padding: "14px 16px",
      textAlign: "left" as const,
      fontSize: "12px",
      color: "#9880b8",
      fontWeight: 600,
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      borderBottom: "1px solid #4a3060",
      background: "#241040",
    },
    td: {
      padding: "14px 16px",
      fontSize: "14px",
      borderBottom: "1px solid #3a2060",
    },
    badge: (paid: boolean, status: string | null) => ({
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 600,
      background: paid ? "#1a3a1a" : status === "staff" ? "#1a2a3a" : "#2a1a1a",
      color: paid ? "#4caf50" : "#888",
      border: `1px solid ${paid ? "#4caf50" : "#555"}`,
    }),
    toggleBtn: (paid: boolean, disabled: boolean) => ({
      padding: "6px 14px",
      borderRadius: "6px",
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "13px",
      fontWeight: 600,
      opacity: disabled ? 0.5 : 1,
      background: paid ? "#3a1a1a" : "#1a3a20",
      color: paid ? "#f44" : "#4caf50",
      transition: "opacity 0.2s",
    }),
  };

  const totalUsers = users.length;
  const paidUsers = users.filter((u) => u.paid).length;
  const staffUsers = users.filter((u) => u.subscription_status === "staff").length;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Admin — User Management</h1>
        <button style={s.backBtn} onClick={() => router.push("/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div style={{ background: "#3a1a1a", border: "1px solid #f44", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", color: "#f88" }}>
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
            background: inviting ? "#3a2a60" : "#d4a843",
            color: inviting ? "#9880b8" : "#1a0a2e",
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
          background: inviteMsg.type === "success" ? "#1a3a1a" : "#3a1a1a",
          border: `1px solid ${inviteMsg.type === "success" ? "#4caf50" : "#f44"}`,
          color: inviteMsg.type === "success" ? "#4caf50" : "#f88",
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
        <div style={{ textAlign: "center", color: "#9880b8", padding: "48px" }}>Loading users...</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Email</th>
              <th style={s.th}>Joined</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Subscription</th>
              <th style={s.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#9880b8", padding: "48px" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} style={{ background: u.email === ADMIN_EMAIL ? "#1e0e38" : "transparent" }}>
                  <td style={s.td}>
                    <span style={{ color: "#e8e0f0" }}>{u.email}</span>
                    {u.email === ADMIN_EMAIL && (
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "#d4a843", fontWeight: 600 }}>YOU</span>
                    )}
                  </td>
                  <td style={{ ...s.td, color: "#9880b8" }}>
                    {new Date(u.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={s.td}>
                    <span style={s.badge(u.paid, u.subscription_status)}>
                      {u.paid ? "Paid" : "Free"}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: "#9880b8", fontSize: "13px" }}>
                    {u.subscription_status ?? "—"}
                  </td>
                  <td style={s.td}>
                    {u.email === ADMIN_EMAIL ? (
                      <span style={{ fontSize: "12px", color: "#9880b8" }}>—</span>
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
