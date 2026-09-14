import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Environment configuration & secrets
const CRON_SECRET = process.env.CRON_SECRET || "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@kiet-bunk-helper.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn("Failed to set VAPID details in daily-reminder:", err);
  }
}

interface SnapshotCourseComponent {
  courseCode: string;
  courseName: string;
  courseId: number;
  componentName: string;
  courseComponentId: number;
  present: number;
  extraAttendance: number;
  total: number;
  percentage: number;
}

interface SnapshotScheduleEntry {
  courseCode: string | null;
  courseName: string | null;
  courseCompName: string | null;
  start: string;
  end: string;
  type: "CLASS" | "HOLIDAY";
  classRoom: string | null;
}

/**
 * Returns today's date in IST (Asia/Kolkata) as YYYY-MM-DD.
 */
function getTodayIstDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Parses KIET date string formats safely into Date object.
 */
function parseKietDateTime(value: string): Date {
  if (!value || typeof value !== "string") {
    return new Date();
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [datePart, timePart] = value.split(/[T ]/);
    const [year, month, day] = datePart.split("-").map(Number);
    if (timePart && timePart.includes(":")) {
      const [hours, minutes, seconds] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
    }
    return new Date(year, month - 1, day);
  }

  const [datePart, timePart] = value.split(" ");
  if (datePart && datePart.includes("/")) {
    const [day, month, year] = datePart.split("/").map(Number);
    if (timePart && timePart.includes(":")) {
      const [hours, minutes, seconds] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
    }
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function calculateSafeBunks(present: number, total: number): number {
  return total > 0 ? Math.max(0, Math.floor(present / 0.75 - total)) : 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Cron Authorization Check
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized. Invalid CRON_SECRET token." });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Supabase configuration missing." });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const todayIstDate = getTodayIstDateString();

  // 2. Query enabled push subscriptions
  const { data: activeSubs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_hash, student_name, endpoint, p256dh, auth")
    .eq("enabled", true);

  if (subErr) {
    console.error("Failed to query push_subscriptions:", subErr);
    res.status(500).json({ error: "Database query failed.", details: subErr.message });
    return;
  }

  if (!activeSubs || activeSubs.length === 0) {
    res.status(200).json({
      ok: true,
      todayIstDate,
      processedUsers: 0,
      message: "No active push subscriptions found.",
    });
    return;
  }

  // Group subscriptions by user_hash
  const userMap = new Map<string, typeof activeSubs>();
  for (const sub of activeSubs) {
    const list = userMap.get(sub.user_hash) || [];
    list.push(sub);
    userMap.set(sub.user_hash, list);
  }

  let successUsers = 0;
  let skippedUsers = 0;
  let failedUsers = 0;

  // 3. Process each student independently with strict error isolation
  for (const [userHash, subscriptions] of userMap.entries()) {
    const idempotencyKey = `${userHash}:${todayIstDate}:daily_attendance_plan`;

    let logId: string | null = null;

    try {
      // 4. Atomic Idempotency Claim BEFORE processing/sending
      const { data: logInsert, error: claimErr } = await supabase
        .from("notification_delivery_logs")
        .insert({
          user_hash: userHash,
          notification_date: todayIstDate,
          notification_type: "daily_attendance_plan",
          idempotency_key: idempotencyKey,
          status: "failed", // Temporary status during claim
          error_message: "Processing daily attendance plan...",
        })
        .select("id")
        .single();

      if (claimErr) {
        // If unique constraint error (23505), another cron already claimed/processed
        if (claimErr.code === "23505" || claimErr.message.includes("unique")) {
          console.log(`Skipping student hash ${userHash.slice(0, 8)}... — already claimed for ${todayIstDate}`);
          skippedUsers += 1;
          continue;
        }
        console.error(`Failed to claim notification log for ${userHash.slice(0, 8)}...:`, claimErr);
        failedUsers += 1;
        continue;
      }

      logId = logInsert.id;

      // 5. Query latest snapshot for student
      const { data: snapshots, error: snapErr } = await supabase
        .from("daily_attendance_snapshots")
        .select("captured_at, attendance_data, schedule_data")
        .eq("user_hash", userHash)
        .order("captured_at", { ascending: false })
        .limit(1);

      if (snapErr || !snapshots || snapshots.length === 0) {
        await supabase
          .from("notification_delivery_logs")
          .update({
            status: "skipped_no_classes",
            error_message: "No snapshot available",
          })
          .eq("id", logId);
        skippedUsers += 1;
        continue;
      }

      const snapshot = snapshots[0];
      const capturedAt = new Date(snapshot.captured_at);
      const ageHours = (Date.now() - capturedAt.getTime()) / (1000 * 60 * 60);

      let notificationTitle = "KIET Bunk Helper";
      let notificationBody = "";

      // 6. Stale Snapshot Policy (> 72 hours)
      if (ageHours > 72) {
        notificationBody = "Attendance data is over 3 days old. Refresh your attendance in KIET Bunk Helper.";
      } else {
        // 7. Today's Classes Identification
        const scheduleEntries = (snapshot.schedule_data || []) as SnapshotScheduleEntry[];
        const todayClasses = scheduleEntries.filter((entry) => {
          if (entry.type === "HOLIDAY") return false;
          const entryDate = parseKietDateTime(entry.start);
          return getTodayIstDateString(entryDate) === todayIstDate;
        });

        if (todayClasses.length === 0) {
          // No classes scheduled for today
          await supabase
            .from("notification_delivery_logs")
            .update({
              status: "skipped_no_classes",
              error_message: null,
            })
            .eq("id", logId);
          skippedUsers += 1;
          continue;
        }

        // 8. Attendance Recommendation Calculation
        const courses = (snapshot.attendance_data || []) as SnapshotCourseComponent[];
        
        // Group today's classes by subject component
        const subjectClassCount = new Map<string, number>();
        for (const entry of todayClasses) {
          const key = [
            normalizeIdentifier(entry.courseCode),
            normalizeIdentifier(entry.courseCompName),
          ].join(":");
          subjectClassCount.set(key, (subjectClassCount.get(key) || 0) + 1);
        }

        const lines: string[] = [];
        let totalSafeBunksToday = 0;
        let mustAttendAny = false;

        for (const course of courses) {
          const key = [
            normalizeIdentifier(course.courseCode),
            normalizeIdentifier(course.componentName),
          ].join(":");

          const todayCount = subjectClassCount.get(key) || 0;
          if (todayCount === 0) continue;

          const safeBunks = calculateSafeBunks(course.present, course.total);
          const name = course.courseName || course.courseCode || "Class";

          if (course.percentage < 75) {
            mustAttendAny = true;
            lines.push(`${name}: attend (at ${Math.round(course.percentage)}%)`);
          } else if (safeBunks > 0) {
            const missable = Math.min(todayCount, safeBunks);
            totalSafeBunksToday += missable;
            lines.push(`${name}: can miss ${missable}`);
          } else {
            mustAttendAny = true;
            lines.push(`${name}: try not to miss`);
          }
        }

        if (lines.length === 0) {
          // Fallback if schedule entry didn't match specific courses directly
          notificationBody = `Good morning! You have ${todayClasses.length} class${todayClasses.length > 1 ? "es" : ""} scheduled today. Check your plan in KIET Bunk Helper.`;
        } else if (lines.length === 1) {
          notificationBody = `Good morning!\nToday: ${lines[0]}`;
        } else if (totalSafeBunksToday > 0 && !mustAttendAny) {
          notificationBody = `Good morning!\nToday: You can miss ${totalSafeBunksToday} class${totalSafeBunksToday > 1 ? "es" : ""} and stay above 75%.`;
        } else {
          notificationBody = `Good morning!\n` + lines.slice(0, 3).join("\n");
        }

        // Stale snapshot note for 24h-72h old snapshots
        if (ageHours >= 24) {
          notificationBody = `(Attendance checked yesterday)\n` + notificationBody;
        }
      }

      // 9. Web Push Delivery to User's Subscriptions
      const pushPayload = JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        tag: "daily-attendance-plan",
        url: "/",
      });

      let sentCount = 0;
      let expiredCount = 0;
      const pushErrors: string[] = [];

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload
          );
          sentCount += 1;
        } catch (pushErr: any) {
          const statusCode = pushErr?.statusCode || pushErr?.status;
          const errorMsg = pushErr instanceof Error ? pushErr.message : String(pushErr);
          pushErrors.push(`Endpoint ${sub.id.slice(0, 8)}... status ${statusCode || "err"}: ${errorMsg}`);

          // 404/410 -> Subscription expired, disable ONLY this endpoint
          if (statusCode === 404 || statusCode === 410) {
            expiredCount += 1;
            await supabase
              .from("push_subscriptions")
              .update({ enabled: false, updated_at: new Date().toISOString() })
              .eq("id", sub.id);
          }
        }
      }

      // 10. Update Delivery Log Row
      let finalStatus: "success" | "expired_subscription" | "failed" = "failed";
      let finalErrorMessage: string | null = null;

      if (sentCount > 0) {
        finalStatus = "success";
        successUsers += 1;
      } else if (expiredCount === subscriptions.length) {
        finalStatus = "expired_subscription";
        finalErrorMessage = "All push endpoints returned 404/410 (expired)";
        failedUsers += 1;
      } else {
        finalStatus = "failed";
        finalErrorMessage = pushErrors.join("; ");
        failedUsers += 1;
      }

      await supabase
        .from("notification_delivery_logs")
        .update({
          status: finalStatus,
          error_message: finalErrorMessage,
        })
        .eq("id", logId);

    } catch (userErr: any) {
      console.error(`Unexpected error processing user ${userHash.slice(0, 8)}...:`, userErr);
      failedUsers += 1;
      if (logId) {
        await supabase
          .from("notification_delivery_logs")
          .update({
            status: "failed",
            error_message: userErr instanceof Error ? userErr.message : String(userErr),
          })
          .eq("id", logId)
          .catch(() => {});
      }
    }
  }

  res.status(200).json({
    ok: true,
    todayIstDate,
    processedUsers: userMap.size,
    successUsers,
    skippedUsers,
    failedUsers,
    timestamp: new Date().toISOString(),
  });
}
