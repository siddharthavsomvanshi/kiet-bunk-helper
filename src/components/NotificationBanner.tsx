import React, { useEffect, useState } from "react";
import {
  isPushSupported,
  getNotificationPermissionState,
  getVapidPublicKey,
  requestNotificationPermission,
  getExistingPushSubscription,
  subscribeToPushManager,
  registerPushSubscriptionAsync,
  unsubscribePushAsync,
  sendTestNotificationAsync,
} from "../services/notificationService";

export function NotificationBanner({ studentName }: { studentName?: string }) {
  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false);
      return;
    }
    checkState();
  }, []);

  async function checkState() {
    const perm = getNotificationPermissionState();
    setPermission(perm);

    if (perm === "granted") {
      const sub = await getExistingPushSubscription();
      setIsEnabled(!!sub);
    } else {
      setIsEnabled(false);
    }
  }

  async function handleEnable() {
    setLoading(true);
    setMessage(null);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setMessage({
          text: "Notifications are blocked in your browser settings. Please enable them in browser settings.",
          type: "error",
        });
        setIsEnabled(false);
        setLoading(false);
        return;
      }

      const vapidKey = getVapidPublicKey();
      if (!vapidKey) {
        setMessage({ text: "VAPID Public Key missing. Contact admin.", type: "error" });
        setLoading(false);
        return;
      }

      const sub = await subscribeToPushManager(vapidKey);
      if (!sub) {
        setMessage({ text: "Could not create push subscription.", type: "error" });
        setLoading(false);
        return;
      }

      const res = await registerPushSubscriptionAsync(sub, studentName);
      if (!res.ok) {
        setMessage({ text: res.error || "Failed to register subscription.", type: "error" });
        setIsEnabled(false);
      } else {
        setIsEnabled(true);
        setMessage({ text: "Daily 8:00 AM IST attendance notifications enabled!", type: "success" });
      }
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to enable notifications.",
        type: "error",
      });
      setIsEnabled(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    setMessage(null);
    try {
      const sub = await getExistingPushSubscription();
      if (sub) {
        await unsubscribePushAsync(sub);
      }
      setIsEnabled(false);
      setMessage({ text: "Daily attendance notifications disabled.", type: "info" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to disable notifications.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTestPush() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await sendTestNotificationAsync();
      if (res.ok) {
        setMessage({ text: "Test push notification sent!", type: "success" });
      } else {
        setMessage({ text: res.message || "Failed to send test push.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error sending test push.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return null;
  }

  return (
    <section
      className="standard-card rise-in"
      style={{
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            Smart Daily Notifications (8:00 AM IST)
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {permission === "denied"
              ? "Notifications blocked in browser settings"
              : isEnabled
              ? "Daily morning attendance recommendations are ON"
              : "Get personalized attendance advice every morning"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {permission === "denied" ? (
          <span style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>Blocked</span>
        ) : isEnabled ? (
          <>
            <button
              type="button"
              onClick={handleTestPush}
              disabled={loading}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              Test Push
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={loading}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Disabling..." : "Disable"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 6,
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Enabling..." : "Enable"}
          </button>
        )}
      </div>

      {message && (
        <div
          style={{
            width: "100%",
            fontSize: 12,
            marginTop: 4,
            color:
              message.type === "success"
                ? "var(--success)"
                : message.type === "error"
                ? "var(--danger)"
                : "var(--text-muted)",
          }}
        >
          {message.text}
        </div>
      )}
    </section>
  );
}
