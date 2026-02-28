import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kevria Calc — NDIS Budget Management for Providers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1150 0%, #2d1b69 50%, #1a1150 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background circles */}
        <div style={{ position: "absolute", top: 60, right: 120, width: 220, height: 220, borderRadius: "50%", background: "#d4a843", opacity: 0.12, display: "flex" }} />
        <div style={{ position: "absolute", bottom: 40, left: 80, width: 160, height: 160, borderRadius: "50%", background: "#5b6abf", opacity: 0.18, display: "flex" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <span style={{ fontSize: 52, color: "#d4a843" }}>✦</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: "#ffffff", letterSpacing: "0.06em" }}>KEVRIA</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: -4 }}>CALC</span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: 880,
            lineHeight: 1.15,
            marginBottom: 20,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          The Smartest Way to Manage{" "}
          <span style={{ color: "#d4a843", marginLeft: 12 }}>NDIS Budgets</span>
        </div>

        {/* Subheading */}
        <div style={{ fontSize: 22, color: "#9090c0", textAlign: "center", maxWidth: 680, marginBottom: 44, display: "flex" }}>
          Built by providers · For providers across Australia
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16 }}>
          {["📋 Schedule of Supports", "🗓️ Public Holiday Calc", "📈 Pace Tracking"].map((f) => (
            <div
              key={f}
              style={{
                background: "rgba(212,168,67,0.12)",
                border: "1px solid rgba(212,168,67,0.3)",
                borderRadius: 24,
                padding: "10px 20px",
                fontSize: 17,
                color: "#d4a843",
                display: "flex",
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
