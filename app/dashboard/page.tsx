"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("paid")
        .eq("id", session.user.id)
        .single();

      if (profile?.paid) {
        setPaid(true);
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Error starting checkout. Please try again.");
    }
    setCheckoutLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "white",
      }}>
        Loading...
      </div>
    );
  }

  if (!paid) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "white",
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "20px",
      }}>
        <h1 style={{ marginBottom: "10px" }}>Unlock NDIS Budget Calculator</h1>
        <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
          One-time payment of $9.99 AUD to get lifetime access.
        </p>
        <button
          onClick={handleCheckout}
          disabled={checkoutLoading}
          style={{
            padding: "15px 40px",
            fontSize: "1.2rem",
            backgroundColor: "#22d3ee",
            color: "#0f172a",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {checkoutLoading ? "Redirecting..." : "Pay $9.99 → Unlock"}
        </button>
        <p
          onClick={handleLogout}
          style={{ marginTop: "20px", color: "#94a3b8", cursor: "pointer" }}
        >
          Log out
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      color: "white",
      fontFamily: "sans-serif",
      padding: "40px",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
      }}>
        <h1>NDIS Budget Calculator</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 20px",
            backgroundColor: "#334155",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>

      <div style={{
        background: "#1e293b",
        padding: "30px",
        borderRadius: "12px",
        textAlign: "center",
      }}>
        <h2>✅ Access Unlocked!</h2>
        <p style={{ color: "#94a3b8", marginTop: "10px" }}>
          Your NDIS Budget Calculator is ready to use.
        </p>
        {/* YOUR ACTUAL BUDGET CALCULATOR GOES HERE */}
        <p style={{ color: "#475569", marginTop: "30px" }}>
          Budget calculator coming soon...
        </p>
      </div>
    </div>
  );
}

