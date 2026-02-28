"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0a30",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      color: "white",
      textAlign: "center",
      padding: "40px",
    }}>
      <div style={{ fontSize: "1.5rem", color: "#d4a843", fontWeight: "bold", marginBottom: "32px" }}>✦ KEVRIA CALC</div>

      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>⚠️</div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "12px" }}>Something went wrong</h1>
      <p style={{ color: "#8080a0", fontSize: "1.05rem", marginBottom: "40px", maxWidth: "440px", lineHeight: 1.6 }}>
        An unexpected error occurred. Your data is safe — try refreshing the page or contact us at{" "}
        <a href="mailto:support@kevria.com" style={{ color: "#d4a843", textDecoration: "none" }}>support@kevria.com</a> if the problem persists.
      </p>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => reset()}
          style={{
            padding: "13px 32px",
            backgroundColor: "#d4a843",
            color: "#1a1150",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = "/"}
          style={{
            padding: "13px 32px",
            backgroundColor: "transparent",
            color: "#d4a843",
            border: "2px solid #d4a843",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          Go to Homepage
        </button>
      </div>
    </div>
  );
}
