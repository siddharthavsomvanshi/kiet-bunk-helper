import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const NOTIF_HMAC_SECRET = process.env.NOTIF_HMAC_SECRET || "kiet_bunk_helper_snapshot_hmac_secret_key_2026";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

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
    console.warn("CyberVidya verification error in subscribe:", err);
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

  const body = req.body || {};
  const { endpoint, keys, studentName } = body;

  if (
    !endpoint ||
    typeof endpoint !== "string" ||
    !keys ||
    typeof keys.p256dh !== "string" ||
    typeof keys.auth !== "string"
  ) {
    res.status(400).json({
      error: "Invalid push subscription. Required fields: endpoint (string), keys.p256dh (string), keys.auth (string).",
    });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Supabase environment configuration missing." });
    return;
  }

  // 3. Upsert push subscription on endpoint conflict
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_hash: userHash,
          student_name: studentName || null,
          endpoint: endpoint.trim(),
          p256dh: keys.p256dh.trim(),
          auth: keys.auth.trim(),
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )
      .select("id, enabled");

    if (error) {
      console.error("Failed to upsert push subscription in Supabase:", error);
      res.status(500).json({ error: "Failed to save push subscription.", details: error.message });
      return;
    }

    res.status(200).json({
      ok: true,
      subscriptionId: data?.[0]?.id || null,
      enabled: data?.[0]?.enabled ?? true,
    });
  } catch (dbErr) {
    console.error("Database connection error in subscribe handler:", dbErr);
    res.status(500).json({
      error: "Database operation failed.",
      message: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }
}
