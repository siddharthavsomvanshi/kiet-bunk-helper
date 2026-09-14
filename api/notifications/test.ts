import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import webpush from "web-push";

const NOTIF_HMAC_SECRET = process.env.NOTIF_HMAC_SECRET || "kiet_bunk_helper_snapshot_hmac_secret_key_2026";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@kiet-bunk-helper.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn("Failed to set VAPID details in web-push:", err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, UID"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const uidHeader = Array.isArray(req.headers.uid)
    ? req.headers.uid[0]
    : req.headers.uid;

  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized. CyberVidya session token missing." });
    return;
  }

  let verifiedStudentId: string | number | null = uidHeader || null;

  // 1. Server-side session verification against CyberVidya API
  try {
    const cybervidyaHeaders: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      Authorization: authHeader,
      Host: "kiet.cybervidya.net",
      Origin: "https://kiet.cybervidya.net",
      Referer: "https://kiet.cybervidya.net/main/dashboard",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    };

    if (uidHeader) {
      cybervidyaHeaders["UID"] = String(uidHeader);
    }

    const verifyRes = await fetch("https://kiet.cybervidya.net/api/student/dashboard/registered-courses", {
      headers: cybervidyaHeaders,
    });

    if (!verifyRes.ok) {
      res.status(401).json({ error: "CyberVidya session verification failed or expired." });
      return;
    }

    const json = await verifyRes.json();
    const firstCourse = Array.isArray(json?.data) ? json.data[0] : null;

    if (firstCourse?.studentId) {
      verifiedStudentId = firstCourse.studentId;
    }
  } catch (err) {
    console.warn("CyberVidya verification error in test push:", err);
    if (!verifiedStudentId) {
      res.status(401).json({ error: "Failed to verify CyberVidya session." });
      return;
    }
  }

  if (!verifiedStudentId) {
    res.status(401).json({ error: "Could not establish verified student identity." });
    return;
  }

  // 2. Generate server-side HMAC user_hash
  const userHash = crypto
    .createHmac("sha256", NOTIF_HMAC_SECRET)
    .update(String(verifiedStudentId))
    .digest("hex");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Supabase environment configuration missing." });
    return;
  }

  // 3. Query active subscriptions for student
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_hash", userHash)
    .eq("enabled", true);

  if (error) {
    console.error("Failed to query push subscriptions:", error);
    res.status(500).json({ error: "Database query failed.", details: error.message });
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    res.status(404).json({
      ok: false,
      message: "No active push subscriptions found for this account. Enable notifications first.",
    });
    return;
  }

  // 4. Send Web Push test notification
  const payload = JSON.stringify({
    title: "KIET Bunk Helper",
    body: "Push notifications are working.",
    tag: "test-push",
    url: "/",
  });

  let sentCount = 0;
  let disabledCount = 0;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    const pushSubscriptionObj = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        throw new Error("VAPID keys (VITE_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) are not configured on server.");
      }

      await webpush.sendNotification(pushSubscriptionObj, payload);
      sentCount += 1;
    } catch (pushErr: any) {
      const statusCode = pushErr?.statusCode || pushErr?.status;
      const errorMsg = pushErr instanceof Error ? pushErr.message : String(pushErr);

      console.warn(`Web push error for endpoint (${sub.endpoint.slice(0, 30)}...):`, statusCode, errorMsg);
      errors.push(`Endpoint status ${statusCode || "err"}: ${errorMsg}`);

      // If subscription expired or unsubscribed (404 Not Found or 410 Gone), disable ONLY this endpoint
      if (statusCode === 404 || statusCode === 410) {
        disabledCount += 1;
        await supabase
          .from("push_subscriptions")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("id", sub.id);
      }
    }
  }

  res.status(200).json({
    ok: sentCount > 0,
    sentCount,
    disabledCount,
    totalTargeted: subscriptions.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
