"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgAbn, setOrgAbn] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If user lands here already authenticated (e.g. after email confirmation),
  // send them straight to the dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/dashboard");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.push("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    if (isSignUp) {
      if (!orgName.trim()) {
        setError("Please enter your organisation name — it pre-fills your Schedule of Supports documents.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/login",
          // Stored as account metadata; pre-fills provider details in the app
          data: { org_name: orgName.trim(), abn: orgAbn.trim(), org_phone: orgPhone.trim() },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setNotice("Check your email to confirm your account!");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
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
      <form onSubmit={handleSubmit} style={{
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        padding: "40px",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "400px",
      }}>
        <h2 style={{ marginBottom: "20px", textAlign: "center", color: "#2d1b69" }}>
          {isSignUp ? "Create Account" : "Log In"}
        </h2>

        {error && (
          <p style={{ color: "#dc2626", marginBottom: "15px", textAlign: "center" }}>
            {error}
          </p>
        )}
        {notice && (
          <p style={{ color: "#16a34a", marginBottom: "15px", textAlign: "center" }}>
            {notice}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#0f172a",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}
        />

        <div style={{ position: "relative", marginBottom: "20px" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              paddingRight: "60px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.8rem",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {isSignUp && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b", margin: "0 0 8px" }}>
              Your organisation
            </p>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 10px" }}>
              Pre-fills your Schedule of Supports documents — editable any time.
            </p>
            <input
              type="text"
              placeholder="Organisation name *"
              autoComplete="organization"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              style={{
                width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "6px",
                border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a",
                fontSize: "1rem", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="ABN (optional)"
                value={orgAbn}
                onChange={(e) => setOrgAbn(e.target.value)}
                style={{
                  flex: 1, minWidth: 0, padding: "12px", borderRadius: "6px",
                  border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a",
                  fontSize: "0.95rem", boxSizing: "border-box",
                }}
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={orgPhone}
                onChange={(e) => setOrgPhone(e.target.value)}
                style={{
                  flex: 1, minWidth: 0, padding: "12px", borderRadius: "6px",
                  border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a",
                  fontSize: "0.95rem", boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        )}

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
          {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Log In"}
        </button>

        <p
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            marginTop: "15px",
            textAlign: "center",
            color: "#2d1b69",
            cursor: "pointer",
          }}
        >
          {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
        </p>
        {!isSignUp && (
          <p
            onClick={async () => {
              if (!email) { setError("Enter your email first"); return; }
              setError("");
              setNotice("");
              setLoading(true);
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/reset-password",
              });
              if (error) setError(error.message);
              else setNotice("Password reset link sent! Check your email.");
              setLoading(false);
            }}
            style={{
              marginTop: "10px",
              textAlign: "center",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Forgot your password?
          </p>
        )}
      </form>
    </div>
  );
}

