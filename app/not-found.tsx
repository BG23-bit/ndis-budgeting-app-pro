"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

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

      <div style={{ fontSize: "6rem", fontWeight: "800", color: "#d4a843", lineHeight: 1, marginBottom: "16px" }}>404</div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "12px" }}>Page not found</h1>
      <p style={{ color: "#8080a0", fontSize: "1.05rem", marginBottom: "40px", maxWidth: "440px", lineHeight: 1.6 }}>
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => router.push("/")}
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
          Go to Homepage
        </button>
        <button
          onClick={() => router.push("/dashboard")}
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
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
