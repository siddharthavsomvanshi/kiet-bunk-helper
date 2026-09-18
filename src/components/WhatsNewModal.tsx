import React, { useState, useEffect } from "react";

const CURRENT_WHATS_NEW_VERSION = "2.1";
const STORAGE_KEY = "kiet_seen_whats_new_version";

interface WhatsNewModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenGuide?: () => void;
}

export function WhatsNewModal({ isOpen: overrideIsOpen, onClose, onOpenGuide }: WhatsNewModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (overrideIsOpen !== undefined) {
      setIsOpen(overrideIsOpen);
      return;
    }

    try {
      const seenVersion = localStorage.getItem(STORAGE_KEY);
      if (seenVersion !== CURRENT_WHATS_NEW_VERSION) {
        setIsOpen(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, [overrideIsOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_WHATS_NEW_VERSION);
    } catch {
      // Ignore storage errors
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleLearnNotifications = () => {
    handleDismiss();
    if (onOpenGuide) onOpenGuide();
  };

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
          maxWidth: 520,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            padding: "24px 24px 20px 24px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
            borderBottom: "1px solid var(--border)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "1px",
                background: "var(--primary)",
                color: "#fff",
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              What's New v{CURRENT_WHATS_NEW_VERSION}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              New Feature Update
            </span>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            🚀 Exciting New Features Released!
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "6px 0 0 0" }}>
            We've added powerful new tools to help you manage your attendance and exams effortlessly.
          </p>
        </div>

        {/* Modal Content Items */}
        <div style={{ padding: "20px 24px", display: "grid", gap: 16 }}>
          {/* Feature 1: Notifications */}
          <div
            style={{
              display: "flex",
              gap: 14,
              padding: "14px",
              borderRadius: 16,
              background: "var(--bg-card-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 24,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              🔔
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Smart Daily 8:00 AM Notifications
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                Get personalized morning advice on which classes you can safely bunk or must attend.
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--primary)",
                  fontWeight: 700,
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>💡 Tip: Check app once daily after college to keep advice accurate!</span>
              </div>
            </div>
          </div>

          {/* Feature 2: Official Hall Tickets */}
          <div
            style={{
              display: "flex",
              gap: 14,
              padding: "14px",
              borderRadius: 16,
              background: "var(--bg-card-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 24,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              🎫
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Official CyberVidya Hall Tickets
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                Fetch and download official PDF admit cards for all exam sessions directly in-app.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleLearnNotifications}
            className="action-button action-button--secondary"
            style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600 }}
          >
            💡 How Notifications Work
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="action-button action-button--primary"
            style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700 }}
          >
            Awesome, Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
