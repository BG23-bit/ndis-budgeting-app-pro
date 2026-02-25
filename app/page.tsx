"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a, #1e3a5f)",
      color: "white",
      fontFamily: "sans-serif",
      padding: "20px",
      textAlign: "center",
    }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "10px" }}>
        NDIS Budget Calculator
      </h1>
      <p style={{ fontSize: "1.3rem", marginBottom: "10px", color: "#94a3b8" }}>
        The easiest way to manage NDIS budgets for your business
      </p>
      <p style={{ fontSize: "2rem", marginBottom: "30px", color: "#22d3ee" }}>
        $9.99 AUD — One-time payment
      </p>
      <button
        onClick={() => router.push("/login")}
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
        Get Started →
      </button>
    </div>
  );
}

