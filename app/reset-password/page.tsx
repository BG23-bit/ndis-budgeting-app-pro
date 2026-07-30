"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  // Code-based fallback: corporate mail scanners burn one-time links before the
  // user can click them, so the email also carries a 6-digit code to type here.
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const router = useRouter();

  const verifyCode = async () => {
    if (!otpEmail.trim() || otpCode.trim().length < 6) {
      setOtpMsg("Enter your email and the 6-digit code from the reset email.");
      return;
    }
    setOtpBusy(true);
    setOtpMsg("");
    const { error } = await supabase.auth.verifyOtp({ email: otpEmail.trim(), token: otpCode.trim(), type: "recovery" });
    if (error) setOtpMsg(error.message.includes("expired") || error.message.includes("invalid") ? "That code didn't work — codes last 1 hour and each new email replaces the old code. Request a fresh one and use the newest email." : error.message);
    else setHasSession(true);
    setOtpBusy(false);
  };

  // The recovery link signs the user in via the URL hash; wait for that session
  // before showing the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession((prev) => (prev === true ? prev : !!session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setIsError(true);
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setIsError(true);
      setMessage("Passwords don't match.");
      return;
    }
    setMessage("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setIsError(true);
      setMessage(error.message);
      setLoading(false);
    } else {
      setIsError(false);
      setMessage("Password updated! Taking you to your dashboard...");
      setTimeout(() => router.push("/dashboard"), 1200);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    fontSize: "1rem",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
      color: "#0f172a",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        padding: "40px",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "400px",
      }}>
        <h2 style={{ marginBottom: "20px", textAlign: "center", color: "#2d1b69" }}>
          Set a New Password
        </h2>

        {hasSession === null && (
          <p style={{ textAlign: "center", color: "#64748b" }}>Verifying reset link...</p>
        )}

        {hasSession === false && (
          <>
            <p style={{ textAlign: "center", color: "#dc2626", marginBottom: "8px" }}>
              This reset link is invalid or has expired.
            </p>
            <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem", marginBottom: "20px" }}>
              Some work email systems scan links and use them up before you can click.
              No problem — type the <strong>6-digit code</strong> from the same email instead:
            </p>
            <input
              type="email"
              placeholder="Your email"
              autoComplete="email"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              inputMode="numeric"
              placeholder="6-digit code from the email"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{ ...inputStyle, letterSpacing: "0.3em", textAlign: "center", fontWeight: 700 }}
            />
            {otpMsg && <p style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" }}>{otpMsg}</p>}
            <button
              onClick={verifyCode}
              disabled={otpBusy}
              style={{ width: "100%", padding: "12px", backgroundColor: "#2d1b69", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", marginBottom: "14px" }}
            >
              {otpBusy ? "Checking..." : "Verify code"}
            </button>
            <p
              onClick={() => router.push("/login")}
              style={{ textAlign: "center", color: "#2d1b69", cursor: "pointer", fontSize: "0.9rem" }}
            >
              Back to log in to request a new email
            </p>
          </>
        )}

        {hasSession && (
          <form onSubmit={handleSubmit}>
            {message && (
              <p style={{
                color: isError ? "#dc2626" : "#16a34a",
                marginBottom: "15px",
                textAlign: "center",
              }}>
                {message}
              </p>
            )}
            <input
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              style={{ ...inputStyle, marginBottom: "20px" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#2d1b69",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
              }}
            >
              {loading ? "Please wait..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
