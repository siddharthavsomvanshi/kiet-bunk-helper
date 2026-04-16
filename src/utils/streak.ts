import { callExtension } from "./bridge";
import type { DatewiseAttendanceBucket } from "../types/kiet";

export interface StreakSubjectConfig {
  courseId: number;
  courseComponentId: number;
}

export interface DayStreakRecord {
  dateKey: string;     // YYYY-MM-DD
  total: number;
  attended: number;
}

const CACHE_KEY = "kiet_streak_cache";
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function normalizeIsoDateString(dateString: string): string {
  // KIET returns planLecDate like "2024-04-20" or "2024-04-20T00:00:00"
  return dateString.split("T")[0];
}

export async function fetchGlobalDatewiseAttendance(
  studentId: number | string | null,
  sessionId: number | string | null,
  subjects: StreakSubjectConfig[]
): Promise<Record<string, DayStreakRecord>> {
  if (!studentId) {
    throw new Error("Student ID is required to fetch streak data.");
  }

  // 1. Check Cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
        return parsed.data;
      }
    }
  } catch (error) {
    // Ignore cache parsing errors
  }

  const mergedData: Record<string, DayStreakRecord> = {};

  // 2. Controlled Batched Fetch
  const BATCH_SIZE = 2; // Process 2 subjects at a time
  const BATCH_DELAY_MS = 350; // Delay between batches

  for (let i = 0; i < subjects.length; i += BATCH_SIZE) {
    const batch = subjects.slice(i, i + BATCH_SIZE);
    
    // Execute batch without killing the thread if one throws
    const results = await Promise.allSettled(
      batch.map(async (subject) => {
        const response = await callExtension("FETCH_DATEWISE_ATTENDANCE", {
          studentId,
          sessionId,
          courseId: subject.courseId,
          courseCompId: subject.courseComponentId,
        });
        
        return response as DatewiseAttendanceBucket[];
      })
    );

    // 3. Process + Merge Batch Results
    for (const result of results) {
      if (result.status === "fulfilled") {
        const buckets = result.value;
        const lectures = buckets
          .flatMap((bucket) => bucket.lectureList ?? [])
          .filter((lecture) => Boolean(lecture.planLecDate && lecture.attendance));

        for (const lecture of lectures) {
          if (!lecture.planLecDate) continue;

          const dateKey = normalizeIsoDateString(lecture.planLecDate);
          const status = (lecture.attendance || "").toUpperCase();
          
          // CRITICAL EDGE CASE: If no status or not a standard format, ignore
          if (!status || status === "N/A" || status === "NULL") {
            continue;
          }

          if (!mergedData[dateKey]) {
            mergedData[dateKey] = { dateKey, total: 0, attended: 0 };
          }
           
          // Standard KIET schema rule
          mergedData[dateKey].total += 1;
          
          if (status === "PRESENT" || status === "ADJUSTED") {
            mergedData[dateKey].attended += 1;
          }
        }
      } else {
        console.warn("Failed to fetch a subject's datewise attendance for streak:", result.reason);
      }
    }

    // Delay before next batch (prevent API overload / HTTP 429)
    if (i + BATCH_SIZE < subjects.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // 4. Update Cache
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: mergedData,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("Failed to cache streak data", e);
  }

  return mergedData;
}

export function calculateStrictStreak(mergedData: Record<string, DayStreakRecord>): number {
  const allDays = Object.values(mergedData);
  
  if (allDays.length === 0) {
    return 0; // No valid class days evaluated
  }

  // Sort descending (most recent first)
  allDays.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  let streak = 0;
  
  // Set boundary to today to prevent counting future projected placeholders if any leaked via API
  const todayKey = normalizeIsoDateString(new Date().toISOString());

  // Determine if today is fully marked. Actually KIET marks attendance real-time, but lets process neutrally.
  // We iterate purely backwards on days that actually have total > 0.
  for (const day of allDays) {
    if (day.dateKey > todayKey) {
      // Ignore future dates entirely
      continue; 
    }
    
    // Ignore neutral days / holidays / exams with no mapped "total"
    if (day.total === 0) {
      continue;
    }

    if (day.dateKey === todayKey && day.attended < day.total) {
      // If it's today and attendance is partial/not fully marked, it's safer to skip calculating today 
      // towards a BREAK unless we know classes are over. But if all are attended, we count it as +1.
      if (day.attended === 0) {
        // Safe skip: Probably hasn't occurred yet today.
        // Continuing streak evaluation from yesterday
        continue;
      }
    }

    // Mathematical condition (Even 1 miss breaks streak)
    if (day.attended === day.total) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}
