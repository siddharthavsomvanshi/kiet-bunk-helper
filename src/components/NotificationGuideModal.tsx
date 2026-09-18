import React from "react";

interface NotificationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnable?: () => void;
  isEnabled?: boolean;
}

export function NotificationGuideModal({
  isOpen,
  onClose,
  onEnable,
  isEnabled,
}: NotificationGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="rise-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          width: "95%",
          maxWidth: 580,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-card-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>💡</span>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                How Smart Notifications Work
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                Get accurate daily morning bunk recommendations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="action-button action-button--secondary"
            style={{ padding: "6px 12px", fontSize: 12 }}
          >
            ✕ Close
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", display: "grid", gap: 20 }}>
          {/* Live Lock Screen Notification Preview Mockup */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
              📲 What your 8:00 AM Notification looks like
            </div>

            <div
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                borderRadius: 18,
                padding: "16px 18px",
                color: "#fff",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Notification Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "#6366f1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    🎯
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>KIET Bunk Helper</span>
                </div>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>8:00 AM IST</span>
              </div>

              {/* Notification Body Content */}
              <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>🟢 Lec 1 (DBMS):</span>
                  <span>Can miss</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#f87171", fontWeight: 700 }}>🚨 Lec 2 (Operating Systems):</span>
                  <span>Attend (72%)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>⚠️ Lec 3 (Computer Networks):</span>
                  <span>Try not to miss</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Step Process Explanation */}
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              ⚡ 3 Simple Steps for Best Results
            </div>

            {/* Step 1 */}
            <div
              style={{
                display: "flex",
                gap: 14,
                padding: 14,
                borderRadius: 14,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "var(--primary)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Check the app at least once daily (After College)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                  Whenever you open KIET Bunk Helper after college, it automatically captures your latest CyberVidya attendance numbers so the system knows your exact counts.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              style={{
                display: "flex",
                gap: 14,
                padding: 14,
                borderRadius: 14,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "var(--primary)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Automated 8:00 AM Cron Calculation
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                  Every morning at 8:00 AM IST, our cloud engine matches today's timetable with your subject attendance percentages and safe bunk counts.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              style={{
                display: "flex",
                gap: 14,
                padding: 14,
                borderRadius: 14,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "var(--primary)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Receive Morning Advice On Your Lock Screen
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                  Before leaving for campus, your phone notifies you which lectures you can safely skip or must attend to stay above 75%.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="action-button action-button--secondary"
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Got It
          </button>

          {!isEnabled && onEnable && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEnable();
              }}
              className="action-button action-button--primary"
              style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700 }}
            >
              🔔 Enable Notifications Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
