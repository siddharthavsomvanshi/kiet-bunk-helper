import type { ScheduleEntry, StudentDetails } from "../types/kiet";
import { getStoredSession } from "./cybervidyaApi";
import { createUnifiedSnapshotPayload } from "../utils/attendanceSnapshot";

/**
 * Asynchronously sends a read-only Unified Attendance + Schedule Snapshot to the backend.
 * This operation is FIRE-AND-FORGET and must NEVER block or break the core application flow.
 */
export async function sendSnapshotAsync(
  attendance: StudentDetails,
  schedule: ScheduleEntry[]
): Promise<boolean> {
  try {
    const session = getStoredSession();
    if (!session.hasToken || !session.token) {
      return false;
    }

    const payload = createUnifiedSnapshotPayload(attendance, schedule, session.capturedAt);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: session.token,
    };

    if (session.studentId) {
      headers["UID"] = String(session.studentId);
    }

    const response = await fetch("/api/notifications/snapshot", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn("Snapshot upload server response not OK:", response.status, errText);
      return false;
    }

    return true;
  } catch (err) {
    // Silently handle network/snapshot errors to keep core app 100% isolated
    console.warn("Non-blocking notification snapshot upload skipped:", err);
    return false;
  }
}

/* =============================================================================
 * PHASE 4: WEB PUSH SUBSCRIPTION & LIFECYCLE MANAGEMENT
 * ============================================================================= */

/**
 * Checks whether the current browser environment supports Service Workers, PushManager, and Notifications.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Returns current browser notification permission state ('granted' | 'denied' | 'default').
 */
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Retrieves the VAPID Public Key configured for client-side push subscriptions.
 */
export function getVapidPublicKey(): string {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) || "";
}

/**
 * Requests browser notification permission.
 * MUST ONLY be called as a direct result of explicit user interaction (e.g. clicking "Enable").
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    return "denied";
  }
  return Notification.requestPermission();
}

/**
 * Converts a URL-safe Base64 string to a Uint8Array suitable for applicationServerKey.
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks for an existing active PushSubscription on the active ServiceWorkerRegistration.
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration || !registration.pushManager) {
      return null;
    }
    return registration.pushManager.getSubscription();
  } catch (err) {
    console.warn("Failed to retrieve existing push subscription:", err);
    return null;
  }
}

/**
 * Subscribes the current browser/device to PushManager using the VAPID Public Key.
 */
export async function subscribeToPushManager(
  publicVapidKey: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error("Web Push is not supported on this browser.");
  }

  if (!publicVapidKey) {
    throw new Error("VAPID Public Key (VITE_VAPID_PUBLIC_KEY) is missing.");
  }

  const registration = await navigator.serviceWorker.ready;
  if (!registration || !registration.pushManager) {
    throw new Error("Active ServiceWorker with PushManager support is not available.");
  }

  const applicationServerKey = urlBase64ToUint8Array(publicVapidKey);

  // Check for existing subscription first
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  return subscription;
}

/**
 * Sends a PushSubscription object to the backend serverless endpoint /api/notifications/subscribe.
 */
export async function registerPushSubscriptionAsync(
  subscription: PushSubscription,
  studentName?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = getStoredSession();
    if (!session.hasToken || !session.token) {
      return { ok: false, error: "CyberVidya session missing. Log in again." };
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { ok: false, error: "Invalid PushSubscription payload." };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: session.token,
    };

    if (session.studentId) {
      headers["UID"] = String(session.studentId);
    }

    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers,
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        studentName: studentName || null,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: errJson.error || `Server responded with status ${response.status}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Disables a specific PushSubscription endpoint on the server and unsubscribes locally.
 */
export async function unsubscribePushAsync(
  subscription: PushSubscription
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = getStoredSession();
    const endpoint = subscription.endpoint;

    // 1. Send server notification to set enabled = false for this endpoint
    if (session.hasToken && session.token && endpoint) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: session.token,
      };

      if (session.studentId) {
        headers["UID"] = String(session.studentId);
      }

      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ endpoint }),
      }).catch((err) => {
        console.warn("Unsubscribe server call failed (swallowed):", err);
      });
    }

    // 2. Unsubscribe locally from PushManager
    await subscription.unsubscribe().catch((err) => {
      console.warn("Local pushManager.unsubscribe error:", err);
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Invokes the backend /api/notifications/test endpoint to trigger an instant test push.
 */
export async function sendTestNotificationAsync(): Promise<{
  ok: boolean;
  sentCount?: number;
  message?: string;
}> {
  try {
    const session = getStoredSession();
    if (!session.hasToken || !session.token) {
      return { ok: false, message: "CyberVidya session missing. Log in again." };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: session.token,
    };

    if (session.studentId) {
      headers["UID"] = String(session.studentId);
    }

    const response = await fetch("/api/notifications/test", {
      method: "POST",
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message: data.message || data.error || `Server status ${response.status}`,
      };
    }

    return {
      ok: data.ok ?? true,
      sentCount: data.sentCount ?? 0,
      message: data.message,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
