"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
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
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/login" },
      });
      if (error) {
        setError(error.message);
      } else {
        setError("Check your email to confirm your account!");
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
      background: "#0f172a",
      color: "white",
      fontFamily: "sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#1e293b",
        padding: "40px",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "400px",
      }}>
        <h2 style={{ marginBottom: "20px", textAlign: "center" }}>
          {isSignUp ? "Create Account" : "Log In"}
        </h2>

        {error && (
          <p style={{
            color: error.includes("Check your email") ? "#22d3ee" : "#f87171",
            marginBottom: "15px",
            textAlign: "center",
          }}>
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "white",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "6px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "white",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#22d3ee",
            color: "#0f172a",
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
            color: "#22d3ee",
            cursor: "pointer",
          }}
        >
          {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
        </p>
        {!isSignUp && (
          <p
            onClick={async () => {
              if (!email) { setError("Enter your email first"); return; }
              setLoading(true);
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: "https://ndis-budgeting-app-pro.vercel.app/login",
              });
              if (error) setError(error.message);
              else setError("Password reset link sent! Check your email.");
              setLoading(false);
            }}
            style={{
              marginTop: "10px",
              textAlign: "center",
              color: "#8080a0",
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

