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

export interface StreakResult {
  streak: number | null;
  isReliable: boolean;
  lastUpdated: number;
}

type FetchGlobalDatewiseAttendanceResult = {
  data: Record<string, DayStreakRecord>;
  isReliable: boolean;
  lastUpdated: number;
};

type StreakCachePayload = {
  data: Record<string, DayStreakRecord>;
  lastUpdated: number;
};

const CACHE_KEY_PREFIX = "kiet_streak_cache";

function formatIsoDateParts(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function normalizeIsoDateString(dateInput: string | Date): string {
  if (dateInput instanceof Date) {
    return formatIsoDateParts(
      dateInput.getFullYear(),
      dateInput.getMonth() + 1,
      dateInput.getDate(),
    );
  }

  const isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateInput.slice(0, 10);
  }

  return normalizeIsoDateString(parsedDate);
}

function getCacheKey(
  studentId: number | string,
  sessionId: number | string | null,
  subjects: StreakSubjectConfig[],
): string {
  const subjectSignature = subjects
    .map((subject) => `${subject.courseId}:${subject.courseComponentId}`)
    .sort()
    .join("|");

  return `${CACHE_KEY_PREFIX}:${studentId}:${sessionId ?? "no-session"}:${subjectSignature}`;
}

function isDayStreakRecord(value: unknown): value is DayStreakRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<DayStreakRecord>;
  return (
    typeof record.dateKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.dateKey) &&
    typeof record.total === "number" &&
    typeof record.attended === "number"
  );
}

function readCachedPastData(cacheKey: string, todayKey: string): Record<string, DayStreakRecord> {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      return {};
    }

    const parsed = JSON.parse(cached) as Partial<StreakCachePayload> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed.data)
        .filter(([dateKey, value]) => dateKey < todayKey && isDayStreakRecord(value))
        .map(([dateKey, value]) => [dateKey, value]),
    );
  } catch {
    return {};
  }
}

function getPastOnlyData(
  data: Record<string, DayStreakRecord>,
  todayKey: string,
): Record<string, DayStreakRecord> {
  return Object.fromEntries(
    Object.entries(data).filter(([dateKey]) => dateKey < todayKey),
  );
}

function isCountableAttendanceStatus(status: string): boolean {
  return status !== "" && status !== "N/A" && status !== "NULL";
}

function isAttendedStatus(status: string): boolean {
  return status === "PRESENT" || status === "ADJUSTED";
}

export async function fetchGlobalDatewiseAttendance(
  studentId: number | string | null,
  sessionId: number | string | null,
  subjects: StreakSubjectConfig[],
): Promise<FetchGlobalDatewiseAttendanceResult> {
  if (!studentId) {
    throw new Error("Student ID is required to fetch streak data.");
  }

  const todayKey = normalizeIsoDateString(new Date());
  const cacheKey = getCacheKey(studentId, sessionId, subjects);
  const cachedPastData = readCachedPastData(cacheKey, todayKey);
  const freshData: Record<string, DayStreakRecord> = {};
  const seenClasses = new Set<string>();
  let hadFailure = false;

  // Batched fetches soften extension load without changing the API contract.
  const BATCH_SIZE = 2;
  const BATCH_DELAY_MS = 300;

  for (let i = 0; i < subjects.length; i += BATCH_SIZE) {
    const batch = subjects.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (subject) => {
        const response = await callExtension("FETCH_DATEWISE_ATTENDANCE", {
          studentId,
          sessionId,
          courseId: subject.courseId,
          courseCompId: subject.courseComponentId,
        });

        return {
          subject,
          buckets: response as DatewiseAttendanceBucket[],
        };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { subject, buckets } = result.value;
        const lectures = buckets
          .flatMap((bucket) => bucket.lectureList ?? [])
          .filter((lecture) => Boolean(lecture.planLecDate && lecture.attendance));

        for (const lecture of lectures) {
          if (!lecture.planLecDate) {
            continue;
          }

          const dateKey = normalizeIsoDateString(lecture.planLecDate);
          const status = (lecture.attendance ?? "").toUpperCase();

          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !isCountableAttendanceStatus(status)) {
            continue;
          }

          const identityKey = [
            subject.courseId,
            subject.courseComponentId,
            dateKey,
            lecture.timeSlot ?? "unknown-start",
          ].join(":");

          if (seenClasses.has(identityKey)) {
            continue;
          }
          seenClasses.add(identityKey);

          const dayRecord = freshData[dateKey] ?? { dateKey, total: 0, attended: 0 };
          dayRecord.total += 1;

          if (isAttendedStatus(status)) {
            dayRecord.attended += 1;
          }

          freshData[dateKey] = dayRecord;
        }
      } else {
        console.warn("Failed to fetch a subject's datewise attendance for streak:", result.reason);
        hadFailure = true;
      }
    }

    if (i + BATCH_SIZE < subjects.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  if (hadFailure) {
    return { data: {}, isReliable: false, lastUpdated: Date.now() };
  }

  const mergedData = {
    ...cachedPastData,
    ...freshData,
  };
  const lastUpdated = Date.now();

  try {
    const cachePayload: StreakCachePayload = {
      data: getPastOnlyData(mergedData, todayKey),
      lastUpdated,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
  } catch {
    // Ignore cache write failures and keep the fresh data in memory.
  }

  return { data: mergedData, isReliable: true, lastUpdated };
}

export function calculateStrictStreak(
  fetchResult: FetchGlobalDatewiseAttendanceResult,
): StreakResult {
  if (!fetchResult.isReliable) {
    return { streak: null, isReliable: false, lastUpdated: fetchResult.lastUpdated };
  }

  const allDays = Object.values(fetchResult.data);

  if (allDays.length === 0) {
    return { streak: 0, isReliable: true, lastUpdated: fetchResult.lastUpdated };
  }

  allDays.sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime());

  let streak = 0;
  const todayKey = normalizeIsoDateString(new Date());

  for (const day of allDays) {
    if (day.dateKey > todayKey) {
      continue;
    }

    if (day.total === 0) {
      continue;
    }

    if (day.dateKey === todayKey && day.attended < day.total) {
      if (day.attended === 0) {
        continue;
      }
    }

    if (day.attended === day.total) {
      streak += 1;
    } else {
      break;
    }
  }

  return { streak, isReliable: true, lastUpdated: fetchResult.lastUpdated };
}
