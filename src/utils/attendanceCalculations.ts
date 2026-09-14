import type { ScheduleEntry } from "../types/kiet";
import { parseKietDateTime } from "./date";

export type SubjectSummary = {
  id: string;
  title: string;
  courseCode: string;
  courseId: number;
  componentName: string;
  courseComponentId: number;
  componentCount: number;
  present: number;
  extraAttendance: number;
  total: number;
  percentage: number;
  safeBunks: number;
  classesNeeded: number;
  matchingUpcomingClasses: ScheduleEntry[];
  upcomingCount: number;
  plannedBunkCount: number;
  projectedPresent: number;
  projectedTotal: number;
  projectedPercentage: number;
  bunkAdjustedPresent: number;
  bunkAdjustedTotal: number;
  bunkAdjustedPercentage: number;
  bunkImpact: number;
};

export type OverallSummary = {
  present: number;
  total: number;
  upcomingCount: number;
  plannedBunkCount: number;
  projectedPresent: number;
  projectedTotal: number;
  percentage: number;
  projectedPercentage: number;
};

export type RecoveryStatus = "no_selection" | "safe" | "recoverable" | "not_recovered";

export type RecoveryInsight = {
  status: RecoveryStatus;
  recoveryDateKey: string | null;
  recoveryDateLabel: string | null;
  recoveryClasses: number | null;
  recoveryDays: number | null;
};

export type WholeDayPlanSummary = {
  id: string;
  title: string;
  courseCode: string;
  componentName: string;
  currentPercentage: number;
  selectedClassCount: number;
  attendedClassCount: number;
  afterSelectedPresent: number;
  afterSelectedTotal: number;
  afterSelectedPercentage: number;
  recovery: RecoveryInsight;
};

export function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function calculateAttendancePercentage(
  present: number,
  total: number,
  apiPercentage?: number | null
): number {
  if (typeof apiPercentage === "number") {
    return apiPercentage;
  }
  return total > 0 ? (present / total) * 100 : 0;
}

export function calculateSafeBunks(present: number, total: number): number {
  return total > 0 ? Math.max(0, Math.floor(present / 0.75 - total)) : 0;
}

export function calculateClassesNeeded(
  present: number,
  total: number,
  percentage?: number
): number {
  const pct = percentage ?? calculateAttendancePercentage(present, total);
  if (pct >= 75) {
    return 0;
  }
  return Math.max(0, Math.ceil((0.75 * total - present) / 0.25));
}

export function calculateProjectedAttendance(
  present: number,
  total: number,
  upcomingCount: number,
  currentPercentage?: number
): {
  projectedPresent: number;
  projectedTotal: number;
  projectedPercentage: number;
} {
  const pct = currentPercentage ?? calculateAttendancePercentage(present, total);
  const projectedPresent = present + upcomingCount;
  const projectedTotal = total + upcomingCount;
  const projectedPercentage =
    upcomingCount === 0
      ? pct
      : projectedTotal > 0
        ? (projectedPresent / projectedTotal) * 100
        : 0;

  return { projectedPresent, projectedTotal, projectedPercentage };
}

export function calculateBunkAdjustedAttendance(
  present: number,
  total: number,
  plannedBunkCount: number,
  currentPercentage?: number
): {
  bunkAdjustedPresent: number;
  bunkAdjustedTotal: number;
  bunkAdjustedPercentage: number;
  bunkImpact: number;
} {
  const pct = currentPercentage ?? calculateAttendancePercentage(present, total);
  const bunkAdjustedPresent = present;
  const bunkAdjustedTotal = total + plannedBunkCount;
  const bunkAdjustedPercentage =
    plannedBunkCount === 0
      ? pct
      : bunkAdjustedTotal > 0
        ? (bunkAdjustedPresent / bunkAdjustedTotal) * 100
        : 0;

  return {
    bunkAdjustedPresent,
    bunkAdjustedTotal,
    bunkAdjustedPercentage,
    bunkImpact: bunkAdjustedPercentage - pct,
  };
}

export function calculateOverallSummary(
  subjectSummaries: SubjectSummary[]
): OverallSummary | null {
  if (subjectSummaries.length === 0) {
    return null;
  }

  const present = subjectSummaries.reduce((sum, subject) => sum + subject.present, 0);
  const total = subjectSummaries.reduce((sum, subject) => sum + subject.total, 0);
  const upcomingCount = subjectSummaries.reduce(
    (sum, subject) => sum + subject.upcomingCount,
    0
  );
  const plannedBunkCount = subjectSummaries.reduce(
    (sum, subject) => sum + subject.plannedBunkCount,
    0
  );
  const projectedPresent = subjectSummaries.reduce(
    (sum, subject) => sum + subject.projectedPresent,
    0
  );
  const projectedTotal = subjectSummaries.reduce(
    (sum, subject) => sum + subject.projectedTotal,
    0
  );

  return {
    present,
    total,
    upcomingCount,
    plannedBunkCount,
    projectedPresent,
    projectedTotal,
    percentage: total > 0 ? (present / total) * 100 : 0,
    projectedPercentage: projectedTotal > 0 ? (projectedPresent / projectedTotal) * 100 : 0,
  };
}

export function getScheduleEntryKey(entry: ScheduleEntry): string {
  return [
    normalizeIdentifier(entry.courseCode),
    normalizeIdentifier(entry.courseCompName),
    entry.start,
    entry.end,
  ].join(":");
}

export function getScheduleDateKey(entry: ScheduleEntry): string {
  const date = parseKietDateTime(entry.start);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatDateKeyLabel(dateKey: string): string {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey;
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function getDayDifference(startDateKey: string, endDateKey: string): number {
  const [startYear, startMonth, startDay] = startDateKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDateKey.split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function compareScheduleEntriesByStart(
  left: ScheduleEntry,
  right: ScheduleEntry
): number {
  return parseKietDateTime(left.start).getTime() - parseKietDateTime(right.start).getTime();
}

export function getMatchingUpcomingClasses(
  courseCode: string,
  componentName: string,
  componentCount: number,
  upcomingClasses: ScheduleEntry[]
): ScheduleEntry[] {
  const normalizedCourseCode = normalizeIdentifier(courseCode);
  const normalizedComponentName = normalizeIdentifier(componentName);

  return upcomingClasses.filter((entry) => {
    const entryCourseCode = normalizeIdentifier(entry.courseCode);

    if (entryCourseCode !== normalizedCourseCode) {
      return false;
    }

    if (componentCount <= 1) {
      return true;
    }

    return normalizeIdentifier(entry.courseCompName) === normalizedComponentName;
  });
}

export function buildWholeDayPlan(
  present: number,
  total: number,
  relevantClasses: ScheduleEntry[],
  selectedDateKeys: Set<string>
): {
  selectedClassCount: number;
  attendedClassCount: number;
  afterSelectedPresent: number;
  afterSelectedTotal: number;
  afterSelectedPercentage: number;
  recovery: RecoveryInsight;
} {
  const sortedClasses = [...relevantClasses].sort(compareScheduleEntriesByStart);
  const sortedSelectedDates = Array.from(selectedDateKeys).sort();
  const cutoffDateKey =
    sortedSelectedDates.length > 0 ? sortedSelectedDates[sortedSelectedDates.length - 1] : null;

  if (!cutoffDateKey) {
    return {
      selectedClassCount: 0,
      attendedClassCount: 0,
      afterSelectedPresent: present,
      afterSelectedTotal: total,
      afterSelectedPercentage: total > 0 ? (present / total) * 100 : 0,
      recovery: {
        status: "no_selection",
        recoveryDateKey: null,
        recoveryDateLabel: null,
        recoveryClasses: null,
        recoveryDays: null,
      },
    };
  }

  let runningPresent = present;
  let runningTotal = total;
  let selectedClassCount = 0;
  let attendedClassCount = 0;

  for (const entry of sortedClasses) {
    const dateKey = getScheduleDateKey(entry);

    if (dateKey > cutoffDateKey) {
      break;
    }

    runningTotal += 1;

    if (selectedDateKeys.has(dateKey)) {
      selectedClassCount += 1;
    } else {
      runningPresent += 1;
      attendedClassCount += 1;
    }
  }

  const afterSelectedPercentage = runningTotal > 0 ? (runningPresent / runningTotal) * 100 : 0;

  if (afterSelectedPercentage >= 75) {
    return {
      selectedClassCount,
      attendedClassCount,
      afterSelectedPresent: runningPresent,
      afterSelectedTotal: runningTotal,
      afterSelectedPercentage,
      recovery: {
        status: "safe",
        recoveryDateKey: null,
        recoveryDateLabel: null,
        recoveryClasses: 0,
        recoveryDays: 0,
      },
    };
  }

  let recoveryPresent = runningPresent;
  let recoveryTotal = runningTotal;
  let recoveryClasses = 0;

  for (const entry of sortedClasses) {
    const dateKey = getScheduleDateKey(entry);

    if (dateKey <= cutoffDateKey) {
      continue;
    }

    recoveryPresent += 1;
    recoveryTotal += 1;
    recoveryClasses += 1;

    if ((recoveryPresent / recoveryTotal) * 100 >= 75) {
      return {
        selectedClassCount,
        attendedClassCount,
        afterSelectedPresent: runningPresent,
        afterSelectedTotal: runningTotal,
        afterSelectedPercentage,
        recovery: {
          status: "recoverable",
          recoveryDateKey: dateKey,
          recoveryDateLabel: formatDateKeyLabel(dateKey),
          recoveryClasses,
          recoveryDays: getDayDifference(cutoffDateKey, dateKey),
        },
      };
    }
  }

  return {
    selectedClassCount,
    attendedClassCount,
    afterSelectedPresent: runningPresent,
    afterSelectedTotal: runningTotal,
    afterSelectedPercentage,
    recovery: {
      status: "not_recovered",
      recoveryDateKey: null,
      recoveryDateLabel: null,
      recoveryClasses: null,
      recoveryDays: null,
    },
  };
}
