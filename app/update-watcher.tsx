"use client";
import { useEffect, useState } from "react";

// The build this page's JS was compiled from (inlined at build time).
const BUILT = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "dev").slice(0, 7);

// Long-lived tabs keep running old code after a deploy — the app auto-saves
// but old bugs (and old documents) live on until a manual hard refresh.
// Poll the server's build id and offer a one-click refresh when it moves.
export default function UpdateWatcher() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (BUILT === "dev") return;
    let stop = false;
    async function check() {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const j = await r.json();
        if (!stop && j?.sha && j.sha !== "dev" && j.sha !== BUILT) setStale(true);
      } catch {}
    }
    const iv = setInterval(check, 5 * 60 * 1000);
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    check();
    return () => { stop = true; clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  if (!stale) return null;
  return (
    <div style={{ position: "fixed", bottom: "18px", right: "18px", zIndex: 400, background: "#241456", color: "#ffffff", borderRadius: "999px", padding: "9px 10px 9px 18px", boxShadow: "0 12px 32px rgba(20,10,60,0.45)", display: "flex", gap: "12px", alignItems: "center", maxWidth: "92vw" }}>
      <span style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>Kevria Calc has been updated</span>
      <button onClick={() => window.location.reload()} style={{ background: "#d4a843", color: "#241456", border: "none", borderRadius: "999px", padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
        Refresh to update
      </button>
    </div>
  );
}
