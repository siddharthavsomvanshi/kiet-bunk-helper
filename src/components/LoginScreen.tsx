import React, { useState } from "react";
import { loginDirect, verifyOtpDirect } from "../services/cybervidyaApi";

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your Student ID / Roll Number and Password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await loginDirect(username, password);

      if (result.ok) {
        setLoading(false);
        onSuccess();
        return;
      }

      if (result.requiresOtp && result.transactionId) {
        setTransactionId(result.transactionId);
        setOtpMessage(result.message || "OTP sent to your registered mobile/email.");
        setLoading(false);
        return;
      }

      setError(result.error || "Login failed. Please check your credentials.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim() || !transactionId) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await verifyOtpDirect(transactionId, otp);

      if (result.ok) {
        setLoading(false);
        onSuccess();
        return;
      }

      setError(result.error || "Invalid OTP. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTransactionId(null);
    setOtpMessage(null);
    setError(null);
    setOtp("");
  }

  return (
    <div style={{ maxWidth: 440, margin: "24px auto", padding: "0 12px" }}>
      <section
        className="premium-panel rise-in"
        style={{
          padding: "32px 28px",
          borderRadius: 28,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Branding Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)",
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 800,
              marginBottom: 14,
              boxShadow: "0 8px 20px rgba(124, 58, 237, 0.3)",
            }}
          >
            K
          </div>
          <h1
            style={{
              margin: "0 0 6px 0",
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
            }}
          >
            kiet-bunk-helper
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
            {transactionId
              ? otpMessage || "Enter the 6-digit OTP sent by CyberVidya"
              : "Enter your CyberVidya credentials to continue."}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#f87171",
              fontSize: 14,
              marginBottom: 20,
              lineHeight: 1.4,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {!transactionId ? (
          /* Credentials Form */
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label
                htmlFor="cybervidya-rollno"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                Student ID / Roll Number
              </label>
              <input
                id="cybervidya-rollno"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 2300290100000"
                disabled={loading}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--border-strong)",
                  backgroundColor: "var(--bg-card-subtle)",
                  color: "var(--text-main)",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="cybervidya-pass"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                CyberVidya Password
              </label>
              <input
                id="cybervidya-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--border-strong)",
                  backgroundColor: "var(--bg-card-subtle)",
                  color: "var(--text-main)",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            <button
              type="submit"
              className="action-button action-button--primary"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>
        ) : (
          /* OTP Form */
          <form onSubmit={handleOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label
                htmlFor="cybervidya-otp-input"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  textAlign: "center",
                }}
              >
                6-Digit OTP
              </label>
              <input
                id="cybervidya-otp-input"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                disabled={loading}
                maxLength={6}
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--border-strong)",
                  backgroundColor: "var(--bg-card-subtle)",
                  color: "var(--text-main)",
                  fontSize: 20,
                  letterSpacing: 6,
                  textAlign: "center",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={handleReset}
                disabled={loading}
                style={{ flex: 1, padding: "14px", fontSize: 14, borderRadius: 14 }}
              >
                Back
              </button>
              <button
                type="submit"
                className="action-button action-button--primary"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
