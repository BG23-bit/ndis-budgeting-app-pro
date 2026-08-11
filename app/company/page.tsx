"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCloudSync, NDIS_RATES_2026_27, type ProviderDetails } from "../client";

// Dedicated company profile page. Same storage as the calculator's provider
// details (cloud row "ndis_provider_details" + localStorage mirror), so edits
// here appear everywhere documents are generated.
export function CompanyForm() {
  const [pd, setPd] = useState<ProviderDetails>({ orgName: "", abn: "", contactName: "", email: "", phone: "", address: "", registrationNumber: "" });
  const [loaded, setLoaded] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const [newHolDate, setNewHolDate] = useState("");
  const [newHolName, setNewHolName] = useState("");

  useEffect(() => {
    (async () => {
      try { const raw = localStorage.getItem("kevria_provider_details"); if (raw) setPd((p) => ({ ...p, ...JSON.parse(raw) })); } catch {}
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: row } = await supabase.from("calculator_data").select("data").eq("user_id", user.id).eq("participant_id", "ndis_provider_details").maybeSingle();
          const md: any = user.user_metadata || {};
          setPd((p) => {
            const merged = { ...p, ...((row?.data && typeof row.data === "object") ? row.data : {}) };
            return { ...merged,
              orgName: merged.orgName || md.org_name || "",
              abn: merged.abn || md.abn || "",
              phone: merged.phone || md.org_phone || "",
              registrationNumber: merged.registrationNumber || md.org_registration || "",
              address: merged.address || md.org_address || "",
              email: merged.email || user.email || "",
            };
          });
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) { try { localStorage.setItem("kevria_provider_details", JSON.stringify(pd)); } catch {} } }, [loaded, pd]);
  const saveState = useCloudSync(loaded ? "ndis_provider_details" : "", pd);

  function handleLogoUpload(file: File) {
    if (file.size > 4 * 1024 * 1024) { alert("Logo file must be under 4MB."); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 420 / img.width, 140 / img.height);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/png");
      URL.revokeObjectURL(url);
      if (data.length > 400000) { alert("That image is too detailed to store — try a simpler or smaller logo."); return; }
      setPd((p) => ({ ...p, logo: data }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert("Couldn't read that image — use a PNG or JPG."); };
    img.src = url;
  }

  const rateFields: { key: keyof typeof NDIS_RATES_2026_27; label: string }[] = [
    { key: "weekdayOrd", label: "Weekday (Ord)" },
    { key: "weekdayNight", label: "Weekday (Evening)" },
    { key: "sat", label: "Saturday" },
    { key: "sun", label: "Sunday" },
    { key: "publicHoliday", label: "Public Holiday" },
    { key: "activeSleepoverHourly", label: "Night (overnight)" },
    { key: "fixedSleepoverUnit", label: "Sleepover (flat)" },
  ];

  if (!loaded) return <div className="text-sm py-10 text-center" style={{ color: "#64748b" }}>Loading your company profile…</div>;

  return (
    <div className="grid gap-6">
      <div className="kv-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h2 className="text-lg font-semibold" style={{ color: "#2d1b69" }}>Company details</h2>
          {saveState !== "idle" && <span className="text-xs" style={{ color: saveState === "saving" ? "#b8901a" : "#94a3b8" }}>{saveState === "saving" ? "Saving…" : "Saved ✓"}</span>}
        </div>
        <p className="text-sm mb-5" style={{ color: "#64748b" }}>Pre-fills every Schedule of Supports — saved to your account and shared across all participants and devices.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            { label: "Organisation Name *", key: "orgName", placeholder: "e.g. Big Tree Supports Pty Ltd" },
            { label: "ABN", key: "abn", placeholder: "e.g. 12 345 678 901" },
            { label: "NDIS Registration Number", key: "registrationNumber", placeholder: "e.g. 4050012345" },
            { label: "Contact Person", key: "contactName", placeholder: "e.g. Jane Smith" },
            { label: "Phone", key: "phone", placeholder: "e.g. 07 3000 0000" },
            { label: "Email", key: "email", placeholder: "e.g. admin@yourorg.com.au" },
          ] as { label: string; key: keyof ProviderDetails; placeholder: string }[]).map((f) => (
            <div key={f.key}>
              <div className="text-xs mb-1 font-semibold" style={{ color: "#334155" }}>{f.label}</div>
              <input value={pd[f.key] as string || ""} onChange={(e) => setPd((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="kv-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <div className="sm:col-span-2">
            <div className="text-xs mb-1 font-semibold" style={{ color: "#334155" }}>Address</div>
            <input value={pd.address} onChange={(e) => setPd((p) => ({ ...p, address: e.target.value }))} placeholder="e.g. 47 McPhail Rd, Narangba QLD 4504" className="kv-input w-full rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs mb-1 font-semibold" style={{ color: "#334155" }}>Your logo <span style={{ color: "#94a3b8", fontWeight: 400 }}>— replaces Kevria branding on your documents</span></div>
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />
            {pd.logo ? (
              <div className="flex items-center gap-3 flex-wrap">
                <img src={pd.logo} alt="Your logo" style={{ maxHeight: "44px", maxWidth: "200px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "5px 10px" }} />
                <button onClick={() => logoRef.current?.click()} className="kv-btn" style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#b8901a", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Replace</button>
                <button onClick={() => setPd((p) => { const n = { ...p }; delete n.logo; return n; })} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}>Remove</button>
              </div>
            ) : (
              <button onClick={() => logoRef.current?.click()} className="kv-btn" style={{ background: "none", border: "1px dashed rgba(45,27,105,0.3)", color: "#64748b", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>⬆ Upload logo (PNG or JPG)</button>
            )}
            <div className="text-xs mt-1" style={{ color: "#94a3b8" }}>Without a logo, documents show your organisation name in the header instead.</div>
          </div>
        </div>
      </div>

      <div className="kv-card p-6">
        <h2 className="text-lg font-semibold mb-1" style={{ color: "#2d1b69" }}>Default hourly rates</h2>
        <p className="text-sm mb-5" style={{ color: "#64748b" }}>Charge below the price guide? Set your standard rates once — every new participant starts on these automatically. Leave a field blank to use the price guide. Therapy and coordination categories keep their own caps.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {rateFields.map(({ key, label }) => {
            const cur = pd.defaultRates?.[key];
            return (
              <label key={key} className="block">
                <div className="text-xs mb-1" style={{ color: "#334155" }}>{label} <span style={{ color: "#94a3b8" }}>guide ${NDIS_RATES_2026_27[key]}</span></div>
                <input type="number" step={0.01} min={0} value={typeof cur === "number" && cur > 0 ? cur : ""} placeholder={"$" + NDIS_RATES_2026_27[key]}
                  onChange={(e) => { const v = Number(e.target.value); setPd((p) => { const d: any = { ...(p.defaultRates || {}) }; if (Number.isFinite(v) && v > 0) d[key] = v; else delete d[key]; return { ...p, defaultRates: d }; }); }}
                  onFocus={(e) => e.target.select()} className="kv-input w-full rounded-lg px-3 py-2" />
              </label>
            );
          })}
        </div>
      </div>

      <div className="kv-card p-6">
        <h2 className="text-lg font-semibold mb-1" style={{ color: "#2d1b69" }}>Regional public holidays</h2>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>Statewide and national holidays are added automatically. Add regional ones here (e.g. QLD show days like Ekka People&apos;s Day) — applied to every participant whose plan covers the date.</p>
        {(pd.customHolidays || []).length > 0 && (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 mb-3">
            {(pd.customHolidays || []).map((h) => (
              <div key={h.date} className="flex items-center gap-2 text-sm py-1 px-2 rounded" style={{ background: "rgba(15,23,42,0.03)" }}>
                <span className="kv-money" style={{ color: "#b8901a" }}>{h.date}</span>
                <span style={{ color: "#334155", flex: 1 }}>{h.name}</span>
                <button onClick={() => setPd((p) => ({ ...p, customHolidays: (p.customHolidays || []).filter((x) => x.date !== h.date) }))} title="Remove this holiday" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", borderRadius: "4px", cursor: "pointer", fontSize: "0.72rem", padding: "1px 6px" }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={newHolDate} onChange={(e) => setNewHolDate(e.target.value)} className="kv-input rounded-lg px-2 py-1.5 text-sm" />
          <input value={newHolName} onChange={(e) => setNewHolName(e.target.value)} placeholder="Holiday name — e.g. Ekka People's Day" className="kv-input rounded-lg px-2 py-1.5 text-sm" style={{ minWidth: "220px", flex: 1, maxWidth: "320px" }} />
          <button
            onClick={() => {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(newHolDate)) return;
              setPd((p) => {
                if ((p.customHolidays || []).some((h) => h.date === newHolDate)) return p;
                const list = [...(p.customHolidays || []), { date: newHolDate, name: newHolName.trim() || "Regional holiday" }].sort((a, b) => a.date.localeCompare(b.date));
                return { ...p, customHolidays: list };
              });
              setNewHolDate(""); setNewHolName("");
            }}
            disabled={!/^\d{4}-\d{2}-\d{2}$/.test(newHolDate)}
            className="kv-btn"
            style={{ background: /^\d{4}-\d{2}-\d{2}$/.test(newHolDate) ? "#d4a843" : "#ecdfb6", border: "none", color: "#241456", padding: "7px 14px", borderRadius: "8px", cursor: /^\d{4}-\d{2}-\d{2}$/.test(newHolDate) ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.82rem" }}
          >+ Add holiday</button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    setWelcome(window.location.search.includes("welcome=1"));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setReady(true);
    });
  }, [router]);

  return (
    <main className="min-h-screen" style={{ background: "#f8fafc", color: "#0f172a" }}>
      <div style={{ background: "linear-gradient(135deg, #2d1b69 0%, #3d2787 100%)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "rgba(212,168,67,0.18)", border: "1px solid rgba(212,168,67,0.5)", color: "#d4a843", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>{welcome ? "Skip for now →" : "← Back to Dashboard"}</button>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", fontWeight: 600 }}>Company Profile</div>
      </div>
      <div className="mx-auto max-w-4xl p-6">
        {welcome && (
          <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.4)" }}>
            <div style={{ color: "#b8901a", fontWeight: 800, fontSize: "1.05rem" }}>Welcome to Kevria Calc — step 1 of 2</div>
            <div className="text-sm mt-1" style={{ color: "#475569" }}>
              Set up your company once and every document you ever generate carries your details and branding.
              Then add your first participant. Everything here can be changed later.
            </div>
          </div>
        )}
        {ready ? <CompanyForm /> : <div className="text-sm py-10 text-center" style={{ color: "#64748b" }}>Loading…</div>}
        {welcome && ready && (
          <button
            onClick={() => router.push("/dashboard")}
            className="kv-btn"
            style={{ marginTop: "24px", width: "100%", padding: "15px", background: "#d4a843", color: "#241456", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: 800, fontSize: "1.05rem" }}
          >
            Continue — add your first participant →
          </button>
        )}
      </div>
    </main>
  );
}
