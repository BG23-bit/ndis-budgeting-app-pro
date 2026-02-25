"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Client from "../client";

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
        background: "#000",
        color: "white",
      }}>
        Loading...
      </div>
    );
  }

  // PAID - show full calculator
  if (paid) {
    return <Client />;
  }

  // NOT PAID - show blurred calculator with pay overlay
  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      {/* Blurred calculator in background */}
      <div style={{
        filter: "blur(6px)",
        pointerEvents: "none",
        userSelect: "none",
        opacity: 0.6,
      }}>
        <Client />
      </div>

      {/* Pay overlay */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 50,
      }}>
        <div style={{
          background: "#1e293b",
          padding: "40px",
          borderRadius: "16px",
          textAlign: "center",
          maxWidth: "450px",
          width: "90%",
          border: "1px solid #334155",
        }}>
          <h2 style={{
            fontSize: "1.8rem",
            color: "white",
            marginBottom: "10px",
          }}>
            🔒 Unlock NDIS Budget Calculator
          </h2>
          <p style={{
            color: "#94a3b8",
            marginBottom: "8px",
            fontSize: "1rem",
          }}>
            Get lifetime access to the full NDIS Budget Calculator.
          </p>
          <p style={{
            color: "#94a3b8",
            marginBottom: "8px",
            fontSize: "0.9rem",
          }}>
            ✅ Unlimited support lines
          </p>
          <p style={{
            color: "#94a3b8",
            marginBottom: "8px",
            fontSize: "0.9rem",
          }}>
            ✅ Export to CSV & PDF
          </p>
          <p style={{
            color: "#94a3b8",
            marginBottom: "8px",
            fontSize: "0.9rem",
          }}>
            ✅ Auto-save in your browser
          </p>
          <p style={{
            color: "#94a3b8",
            marginBottom: "20px",
            fontSize: "0.9rem",
          }}>
            ✅ One-time payment — no subscriptions
          </p>
          <p style={{
            fontSize: "2rem",
            color: "#22d3ee",
            fontWeight: "bold",
            marginBottom: "20px",
          }}>
            $9.99 AUD
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
              width: "100%",
            }}
          >
            {checkoutLoading ? "Redirecting to checkout..." : "Pay $9.99 → Unlock Now"}
          </button>
          <p
            onClick={handleLogout}
            style={{
              marginTop: "15px",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Log out
          </p>
        </div>
      </div>
    </div>
  );
}

