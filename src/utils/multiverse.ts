import type {
  ScheduleEntry,
  StudentDetails,
} from "../types/kiet";
import type {
  OverallSummary,
  SubjectSummary,
  BunkableDay,
} from "../App";
import type { DayStreakRecord, SubjectAbsencesByDate } from "./streak";
import { formatIsoDate, parseKietDateTime } from "./date";

export type BunkTypeOption = "entire_day" | "selected_classes";

export interface BunkSelectionItem {
  key: string;            // dateKey or entryKey
  type: BunkTypeOption;
  dateKey: string;        // YYYY-MM-DD
  label: string;          // Display label e.g. "8 Sep — Database Systems" or "9 Sep — Entire Day"
  entryKey?: string;      // If individual class bunk
}

export interface MultiverseScenario {
  enableBunking: boolean;
  enableMedicalLeave: boolean;
  enableTargetDate: boolean;

  bunkType: BunkTypeOption;
  selectedBunkDates: string[];       // Array of dateKeys for entire day bunks
  selectedBunkClassKeys: string[];   // Array of schedule entry keys for individual class bunks

  medicalStartDate: string;          // YYYY-MM-DD
  medicalEndDate: string;            // YYYY-MM-DD

  explicitTargetDate: string;        // YYYY-MM-DD
}

export interface MultiverseSubjectResult {
  id: string;
  title: string;
  courseCode: string;
  courseId: number;
  componentName: string;
  courseComponentId: number;
  
  // Real Baseline
  realPresent: number;
  realTotal: number;
  realPercentage: number;
  realSafeBunks: number;
  realClassesNeeded: number;

  // Simulated
  simulatedPresent: number;
  simulatedTotal: number;
  simulatedPercentage: number;
  simulatedSafeBunks: number;
  simulatedClassesNeeded: number;
  deltaPercentage: number; // simulatedPercentage - realPercentage

  // Breakdown
  medicalLeaveAddedPresent: number;
  futureClassesAttendedCount: number;
  futureClassesBunkedCount: number;

  isSafe: boolean; // simulatedPercentage >= 75
}

export interface MultiverseOverallResult {
  realPresent: number;
  realTotal: number;
  realPercentage: number;

  simulatedPresent: number;
  simulatedTotal: number;
  simulatedPercentage: number;
  deltaPercentagePoints: number; // simulatedPercentage - realPercentage

  belowThresholdSubjectCount: number;
  totalSubjectCount: number;
  isOverallSafe: boolean;
}

export interface MultiverseSimulationExplanation {
  resultDateKey: string;
  resultDateLabel: string;
  isAutomaticDate: boolean;
  activeMedicalLeave: { startDate: string; endDate: string; addedPresent: number } | null;
  activeBunks: BunkSelectionItem[];
  futureClassesAttendedCount: number;
}

export interface MultiverseSimulationResult {
  overall: MultiverseOverallResult;
  subjects: MultiverseSubjectResult[];
  explanation: MultiverseSimulationExplanation;
}

export interface ReadOnlyAttendanceSnapshot {
  attendance: StudentDetails | null;
  subjectSummaries: SubjectSummary[];
  overallSummary: OverallSummary | null;
  streakDayData: Record<string, DayStreakRecord>;
  streakSubjectAbsencesByDate: SubjectAbsencesByDate;
  futureClasses: ScheduleEntry[];
  bunkableDays: BunkableDay[];
}

export const INITIAL_MULTIVERSE_SCENARIO: MultiverseScenario = {
  enableBunking: false,
  enableMedicalLeave: false,
  enableTargetDate: false,

  bunkType: "entire_day",
  selectedBunkDates: [],
  selectedBunkClassKeys: [],

  medicalStartDate: "",
  medicalEndDate: "",

  explicitTargetDate: "",
};

function normalizeIdentifier(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
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

function formatDateKeyLabel(dateKey: string): string {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey;
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getAttendanceSubjectKey(
  subject: Pick<SubjectSummary, "courseId" | "courseComponentId">,
): string {
  return `${subject.courseId}:${subject.courseComponentId}`;
}

export function getMatchingClassesForSubject(
  courseCode: string,
  componentName: string,
  componentCount: number,
  classes: ScheduleEntry[],
): ScheduleEntry[] {
  const normalizedCourseCode = normalizeIdentifier(courseCode);
  const normalizedComponentName = normalizeIdentifier(componentName);

  return classes.filter((entry) => {
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

/**
 * Priority for Automatic Result Date:
 * 1. Explicit target date (if enableTargetDate is true and non-empty)
 * 2. Latest future bunk date (from selected hypothetical bunks)
 * 3. End date of hypothetical medical leave (if enableMedicalLeave is true and non-empty)
 * 4. Current date (today)
 */
export function determineResultDate(scenario: MultiverseScenario, todayKey: string): { dateKey: string; isAutomatic: boolean } {
  if (scenario.enableTargetDate && scenario.explicitTargetDate) {
    return { dateKey: scenario.explicitTargetDate, isAutomatic: false };
  }

  // Find latest bunk date
  const bunkDateKeys: string[] = [];
  if (scenario.enableBunking) {
    if (scenario.bunkType === "entire_day") {
      bunkDateKeys.push(...scenario.selectedBunkDates);
    } else {
      for (const itemKey of scenario.selectedBunkClassKeys) {
        const parts = itemKey.split(":");
        if (parts.length >= 3) {
          const startDateStr = parts[2];
          if (startDateStr) {
            try {
              const dKey = formatIsoDate(parseKietDateTime(startDateStr));
              bunkDateKeys.push(dKey);
            } catch {
              // ignore
            }
          }
        }
      }
    }
  }

  if (bunkDateKeys.length > 0) {
    const sortedBunkDates = [...bunkDateKeys].sort();
    const latestBunkDate = sortedBunkDates[sortedBunkDates.length - 1];
    return { dateKey: latestBunkDate, isAutomatic: true };
  }

  if (scenario.enableMedicalLeave && scenario.medicalEndDate) {
    return { dateKey: scenario.medicalEndDate, isAutomatic: true };
  }

  return { dateKey: todayKey, isAutomatic: true };
}

/**
 * Pure simulation calculation engine.
 * Never mutates snapshot or scenario.
 */
export function calculateMultiverseSimulation(
  snapshot: ReadOnlyAttendanceSnapshot,
  scenario: MultiverseScenario,
): MultiverseSimulationResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatIsoDate(today);

  const { dateKey: resultDateKey, isAutomatic } = determineResultDate(scenario, todayKey);
  const resultDateLabel = formatDateKeyLabel(resultDateKey);

  const bunkDatesSet = new Set(scenario.enableBunking && scenario.bunkType === "entire_day" ? scenario.selectedBunkDates : []);
  const bunkClassKeysSet = new Set(scenario.enableBunking && scenario.bunkType === "selected_classes" ? scenario.selectedBunkClassKeys : []);

  let totalMedicalAddedPresent = 0;
  let totalFutureAttendedCount = 0;

  const subjectResults: MultiverseSubjectResult[] = snapshot.subjectSummaries.map((subject) => {
    const subjectKey = getAttendanceSubjectKey(subject);
    let simulatedPresent = subject.present;
    let simulatedTotal = subject.total;
    let medicalLeaveAddedPresent = 0;
    let futureClassesAttendedCount = 0;
    let futureClassesBunkedCount = 0;

    // 1. Apply Medical Leave Credits (if enabled)
    if (
      scenario.enableMedicalLeave &&
      scenario.medicalStartDate &&
      scenario.medicalEndDate &&
      scenario.medicalStartDate <= scenario.medicalEndDate
    ) {
      for (const [absenceDateKey, subjectAbsenceMap] of Object.entries(snapshot.streakSubjectAbsencesByDate)) {
        if (absenceDateKey >= scenario.medicalStartDate && absenceDateKey <= scenario.medicalEndDate) {
          const missedForSubject = subjectAbsenceMap[subjectKey] ?? 0;
          if (missedForSubject > 0) {
            medicalLeaveAddedPresent += missedForSubject;
          }
        }
      }
      simulatedPresent += medicalLeaveAddedPresent;
      totalMedicalAddedPresent += medicalLeaveAddedPresent;
    }

    // 2. Apply Future Classes up to resultDateKey
    const matchingFutureClasses = getMatchingClassesForSubject(
      subject.courseCode,
      subject.componentName,
      subject.componentCount,
      snapshot.futureClasses,
    );

    for (const entry of matchingFutureClasses) {
      const entryDateKey = getScheduleDateKey(entry);
      if (entryDateKey > resultDateKey) {
        continue;
      }

      const entryKey = getScheduleEntryKey(entry);
      const isBunked =
        scenario.enableBunking &&
        ((scenario.bunkType === "entire_day" && bunkDatesSet.has(entryDateKey)) ||
          (scenario.bunkType === "selected_classes" && bunkClassKeysSet.has(entryKey)));

      simulatedTotal += 1;
      if (isBunked) {
        futureClassesBunkedCount += 1;
      } else {
        simulatedPresent += 1;
        futureClassesAttendedCount += 1;
        totalFutureAttendedCount += 1;
      }
    }

    const realPercentage = subject.percentage;
    const simulatedPercentage = simulatedTotal > 0 ? (simulatedPresent / simulatedTotal) * 100 : 0;
    const deltaPercentage = simulatedPercentage - realPercentage;
    const isSafe = simulatedPercentage >= 75;

    const simulatedSafeBunks = simulatedTotal > 0 ? Math.max(0, Math.floor(simulatedPresent / 0.75 - simulatedTotal)) : 0;
    const simulatedClassesNeeded = isSafe ? 0 : Math.max(0, Math.ceil((0.75 * simulatedTotal - simulatedPresent) / 0.25));

    return {
      id: subject.id,
      title: subject.title,
      courseCode: subject.courseCode,
      courseId: subject.courseId,
      componentName: subject.componentName,
      courseComponentId: subject.courseComponentId,

      realPresent: subject.present,
      realTotal: subject.total,
      realPercentage,
      realSafeBunks: subject.safeBunks,
      realClassesNeeded: subject.classesNeeded,

      simulatedPresent,
      simulatedTotal,
      simulatedPercentage,
      simulatedSafeBunks,
      simulatedClassesNeeded,
      deltaPercentage,

      medicalLeaveAddedPresent,
      futureClassesAttendedCount,
      futureClassesBunkedCount,

      isSafe,
    };
  });

  // Calculate Overall Result
  const realPresent = snapshot.overallSummary?.present ?? subjectResults.reduce((sum, s) => sum + s.realPresent, 0);
  const realTotal = snapshot.overallSummary?.total ?? subjectResults.reduce((sum, s) => sum + s.realTotal, 0);
  const realPercentage = snapshot.overallSummary?.percentage ?? (realTotal > 0 ? (realPresent / realTotal) * 100 : 0);

  const simulatedPresent = subjectResults.reduce((sum, s) => sum + s.simulatedPresent, 0);
  const simulatedTotal = subjectResults.reduce((sum, s) => sum + s.simulatedTotal, 0);
  const simulatedPercentage = simulatedTotal > 0 ? (simulatedPresent / simulatedTotal) * 100 : 0;
  const deltaPercentagePoints = simulatedPercentage - realPercentage;

  const belowThresholdSubjectCount = subjectResults.filter((s) => !s.isSafe).length;
  const totalSubjectCount = subjectResults.length;
  const isOverallSafe = simulatedPercentage >= 75;

  const activeBunkItems: BunkSelectionItem[] = [];
  if (scenario.enableBunking) {
    if (scenario.bunkType === "entire_day") {
      for (const dKey of scenario.selectedBunkDates) {
        activeBunkItems.push({
          key: dKey,
          type: "entire_day",
          dateKey: dKey,
          label: `${formatDateKeyLabel(dKey)} — Entire Day`,
        });
      }
    } else {
      for (const eKey of scenario.selectedBunkClassKeys) {
        const matchingEntry = snapshot.futureClasses.find((c) => getScheduleEntryKey(c) === eKey);
        if (matchingEntry) {
          activeBunkItems.push({
            key: eKey,
            type: "selected_classes",
            dateKey: getScheduleDateKey(matchingEntry),
            label: `${formatDateKeyLabel(getScheduleDateKey(matchingEntry))} — ${matchingEntry.courseName ?? matchingEntry.title}`,
            entryKey: eKey,
          });
        }
      }
    }
  }

  const explanation: MultiverseSimulationExplanation = {
    resultDateKey,
    resultDateLabel,
    isAutomaticDate: isAutomatic,
    activeMedicalLeave:
      scenario.enableMedicalLeave && scenario.medicalStartDate && scenario.medicalEndDate
        ? {
            startDate: scenario.medicalStartDate,
            endDate: scenario.medicalEndDate,
            addedPresent: totalMedicalAddedPresent,
          }
        : null,
    activeBunks: activeBunkItems,
    futureClassesAttendedCount: totalFutureAttendedCount,
  };

  return {
    overall: {
      realPresent,
      realTotal,
      realPercentage,

      simulatedPresent,
      simulatedTotal,
      simulatedPercentage,
      deltaPercentagePoints,

      belowThresholdSubjectCount,
      totalSubjectCount,
      isOverallSafe,
    },
    subjects: subjectResults,
    explanation,
  };
}
