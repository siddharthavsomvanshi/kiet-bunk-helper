import React, { useState } from "react";
import { OverlayDialog } from "./UI";
import { loginDirect, verifyOtpDirect } from "../services/cybervidyaApi";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
        onClose();
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
      setError("Please enter the OTP.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await verifyOtpDirect(transactionId, otp);

      if (result.ok) {
        setLoading(false);
        onSuccess();
        onClose();
        return;
      }

      setError(result.error || "Invalid OTP. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function resetState() {
    setTransactionId(null);
    setOtpMessage(null);
    setError(null);
    setOtp("");
  }

  return (
    <OverlayDialog
      title={transactionId ? "Verify OTP" : "Login to CyberVidya"}
      subtitle={
        transactionId
          ? otpMessage || "Enter the 6-digit OTP sent by CyberVidya"
          : "Connect your KIET ERP account directly without needing the Chrome extension."
      }
      onClose={onClose}
    >
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "8px 0" }}>
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              fontSize: 14,
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        {!transactionId ? (
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                htmlFor="cybervidya-username"
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
                id="cybervidya-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 2300290100000"
                disabled={loading}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--border-strong)",
                  backgroundColor: "var(--bg-card-subtle)",
                  color: "var(--text-main)",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="cybervidya-password"
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
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="cybervidya-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 16px",
                    borderRadius: 14,
                    border: "1px solid var(--border-strong)",
                    backgroundColor: "var(--bg-card-subtle)",
                    color: "var(--text-main)",
                    fontSize: 15,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: 12,
                    background: "none",
                    border: "none",
                    padding: 6,
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="action-button action-button--primary"
                disabled={loading}
                style={{
                  minWidth: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loading ? "Connecting..." : "Login"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                htmlFor="cybervidya-otp"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                Enter OTP
              </label>
              <input
                id="cybervidya-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                disabled={loading}
                maxLength={6}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--border-strong)",
                  backgroundColor: "var(--bg-card-subtle)",
                  color: "var(--text-main)",
                  fontSize: 18,
                  letterSpacing: 4,
                  textAlign: "center",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12 }}>
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={resetState}
                disabled={loading}
              >
                Back to Login
              </button>
              <button
                type="submit"
                className="action-button action-button--primary"
                disabled={loading}
                style={{ minWidth: 120 }}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </form>
        )}
      </div>
    </OverlayDialog>
  );
}
