import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DatewiseAttendanceBucket,
  DatewiseAttendanceLecture,
  ScheduleEntry,
  StudentDetails,
} from "./types/kiet";
import { callExtension } from "./utils/bridge";
import {
  formatCapturedAt,
  formatScheduleDay,
  formatScheduleTime,
  getUpcomingClasses,
  getWeekRange,
  parseKietDateTime,
} from "./utils/date";
import {
  calculateStrictStreak,
  fetchGlobalDatewiseAttendance,
} from "./utils/streak";
import type { StreakResult, StreakSubjectConfig } from "./utils/streak";

import { lazy, Suspense } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Strategy } from "./pages/Strategy";
import { CalendarPage } from "./pages/Calendar";
import { TodayStatus } from "./pages/TodayStatus";
import { Snitch } from "./pages/Snitch";
import { RedemptionArc } from "./components/Attendance/RedemptionArc";
import { Analytics } from "@vercel/analytics/react";
import { Panel, EmptyMessage } from "./components/UI";

const AdminLogin = lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminPanel = lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })));
const ExamMode = lazy(() => import('./pages/ExamMode').then(m => ({ default: m.ExamMode })));

export type LoadState = "idle" | "loading" | "ready" | "error";
const FUTURE_WEEKS_TO_FETCH = 12;

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

export type BunkableDay = {
  dateKey: string;
  label: string;
  entries: ScheduleEntry[];
};

export type StudentContext = {
  studentId: number | string;
  sessionId: number | string | null;
};

export type DatewiseAttendanceState = {
  lectureCount: number;
  presentCount: number;
  percent: number | null;
  extraAttendance: number;
  lectures: DatewiseAttendanceLecture[];
};

function App() {
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [sessionCapturedAt, setSessionCapturedAt] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<StudentDetails | null>(null);
  const [studentContextOverride, setStudentContextOverride] = useState<StudentContext | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<ScheduleEntry[]>([]);
  const [futureClasses, setFutureClasses] = useState<ScheduleEntry[]>([]);
  const [plannedBunks, setPlannedBunks] = useState<Set<string>>(new Set());
  const [expandedPlanners, setExpandedPlanners] = useState<Set<string>>(new Set());
  const [showWholeDayPlanner, setShowWholeDayPlanner] = useState(false);
  const [expandedDatewise, setExpandedDatewise] = useState<Set<string>>(new Set());
  const [datewiseAttendance, setDatewiseAttendance] = useState<
    Record<string, DatewiseAttendanceState>
  >({});
  const [datewiseLoading, setDatewiseLoading] = useState<Set<string>>(new Set());
  const [datewiseErrors, setDatewiseErrors] = useState<Record<string, string>>({});
  const [selectedBunkDates, setSelectedBunkDates] = useState<Set<string>>(new Set());
  const [streakResult, setStreakResult] = useState<StreakResult | null>(null);
  const [streakLoading, setStreakLoading] = useState(false);
  const [error, setError] = useState("");

  const studentContext = useMemo(
    () => studentContextOverride ?? getStudentContext(attendance),
    [attendance, studentContextOverride],
  );

  const streakSubjects = useMemo<StreakSubjectConfig[]>(() => {
    if (!attendance) {
      return [];
    }

    return attendance.attendanceCourseComponentInfoList.flatMap((course) =>
      course.attendanceCourseComponentNameInfoList.map((component) => ({
        courseId: course.courseId,
        courseComponentId: component.courseComponentId,
      })),
    );
  }, [attendance]);

  const subjectSummaries = useMemo<SubjectSummary[]>(() => {
    if (!attendance) {
      return [];
    }

    return attendance.attendanceCourseComponentInfoList.flatMap((course) =>
      course.attendanceCourseComponentNameInfoList.map((component) => {
        const matchingUpcomingClasses = getMatchingUpcomingClasses(
          course.courseCode,
          component.componentName,
          course.attendanceCourseComponentNameInfoList.length,
          upcomingClasses,
        );
        const upcomingCount = matchingUpcomingClasses.length;
        const plannedBunkCount = matchingUpcomingClasses.filter((entry) =>
          plannedBunks.has(getScheduleEntryKey(entry)),
        ).length;
        const present = component.numberOfPresent + component.numberOfExtraAttendance;
        const extraAttendance = component.numberOfExtraAttendance;
        const total = component.numberOfPeriods;
        const percentage =
          typeof component.presentPercentage === "number"
            ? component.presentPercentage
            : total > 0
              ? (present / total) * 100
              : 0;
        const projectedPresent = present + upcomingCount;
        const projectedTotal = total + upcomingCount;
        const projectedPercentage =
          upcomingCount === 0
            ? percentage
            : projectedTotal > 0
              ? (projectedPresent / projectedTotal) * 100
              : 0;
        const bunkAdjustedPresent = present;
        const bunkAdjustedTotal = total + plannedBunkCount;
        const bunkAdjustedPercentage =
          plannedBunkCount === 0
            ? percentage
            : bunkAdjustedTotal > 0
              ? (bunkAdjustedPresent / bunkAdjustedTotal) * 100
              : 0;
        const safeBunks = total > 0 ? Math.max(0, Math.floor(present / 0.75 - total)) : 0;
        const classesNeeded =
          percentage >= 75 ? 0 : Math.max(0, Math.ceil((0.75 * total - present) / 0.25));

        return {
          id: `${course.courseCode}-${component.courseComponentId}`,
          title: course.courseName,
          courseCode: course.courseCode,
          courseId: course.courseId,
          componentName: component.componentName,
          courseComponentId: component.courseComponentId,
          componentCount: course.attendanceCourseComponentNameInfoList.length,
          present,
          extraAttendance,
          total,
          percentage,
          safeBunks,
          classesNeeded,
          matchingUpcomingClasses,
          upcomingCount,
          plannedBunkCount,
          projectedPresent,
          projectedTotal,
          projectedPercentage,
          bunkAdjustedPresent,
          bunkAdjustedTotal,
          bunkAdjustedPercentage,
          bunkImpact: bunkAdjustedPercentage - percentage,
        };
      }),
    );
  }, [attendance, upcomingClasses, plannedBunks]);

  const overallSummary = useMemo(() => {
    if (subjectSummaries.length === 0) {
      return null;
    }

    const present = subjectSummaries.reduce((sum, subject) => sum + subject.present, 0);
    const total = subjectSummaries.reduce((sum, subject) => sum + subject.total, 0);
    const upcomingCount = subjectSummaries.reduce((sum, subject) => sum + subject.upcomingCount, 0);
    const plannedBunkCount = subjectSummaries.reduce(
      (sum, subject) => sum + subject.plannedBunkCount,
      0,
    );
    const projectedPresent = subjectSummaries.reduce(
      (sum, subject) => sum + subject.projectedPresent,
      0,
    );
    const projectedTotal = subjectSummaries.reduce(
      (sum, subject) => sum + subject.projectedTotal,
      0,
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
  }, [subjectSummaries]);

  const bunkableDays = useMemo<BunkableDay[]>(() => {
    const groupedDays = new Map<string, ScheduleEntry[]>();

    for (const entry of futureClasses) {
      const dateKey = getScheduleDateKey(entry);
      const existingEntries = groupedDays.get(dateKey) ?? [];
      existingEntries.push(entry);
      groupedDays.set(dateKey, existingEntries);
    }

    return Array.from(groupedDays.entries())
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([dateKey, entries]) => ({
        dateKey,
        label: formatScheduleDay(entries[0].start),
        entries,
      }));
  }, [futureClasses]);

  const selectedBunkCutoffDateKey = useMemo(() => {
    const selectedDates = Array.from(selectedBunkDates).sort();
    return selectedDates.length > 0 ? selectedDates[selectedDates.length - 1] : null;
  }, [selectedBunkDates]);

  const wholeDayPlanSummaries = useMemo<WholeDayPlanSummary[]>(() => {
    if (!attendance) {
      return [];
    }

    return subjectSummaries.map((subject) => {
      const matchingFutureClasses = getMatchingUpcomingClasses(
        subject.courseCode,
        subject.componentName,
        subject.componentCount,
        futureClasses,
      );

      const plan = buildWholeDayPlan(
        subject.present,
        subject.total,
        matchingFutureClasses,
        selectedBunkDates,
      );

      return {
        id: subject.id,
        title: subject.title,
        courseCode: subject.courseCode,
        componentName: subject.componentName,
        currentPercentage: subject.percentage,
        selectedClassCount: plan.selectedClassCount,
        attendedClassCount: plan.attendedClassCount,
        afterSelectedPresent: plan.afterSelectedPresent,
        afterSelectedTotal: plan.afterSelectedTotal,
        afterSelectedPercentage: plan.afterSelectedPercentage,
        recovery: plan.recovery,
      };
    });
  }, [attendance, subjectSummaries, futureClasses, selectedBunkDates]);

  const overallWholeDayPlan = useMemo(() => {
    if (!overallSummary) {
      return null;
    }

    const plan = buildWholeDayPlan(
      overallSummary.present,
      overallSummary.total,
      futureClasses,
      selectedBunkDates,
    );

    return {
      currentPercentage: overallSummary.percentage,
      selectedClassCount: plan.selectedClassCount,
      attendedClassCount: plan.attendedClassCount,
      afterSelectedPresent: plan.afterSelectedPresent,
      afterSelectedTotal: plan.afterSelectedTotal,
      afterSelectedPercentage: plan.afterSelectedPercentage,
      recovery: plan.recovery,
    };
  }, [overallSummary, futureClasses, selectedBunkDates]);

  useEffect(() => {
    if (!attendance) {
      setStreakResult(null);
      setStreakLoading(false);
      return;
    }

    if (!studentContext) {
      setStreakResult({
        streak: null,
        isReliable: false,
        lastUpdated: Date.now(),
      });
      setStreakLoading(false);
      return;
    }

    if (streakSubjects.length === 0) {
      setStreakResult({
        streak: 0,
        isReliable: true,
        lastUpdated: Date.now(),
      });
      setStreakLoading(false);
      return;
    }

    let isCancelled = false;
    setStreakLoading(true);

    void (async () => {
      try {
        const fetchResult = await fetchGlobalDatewiseAttendance(
          studentContext.studentId,
          studentContext.sessionId,
          streakSubjects,
        );
        const nextResult = calculateStrictStreak(fetchResult);

        if (!isCancelled) {
          setStreakResult(nextResult);
        }
      } catch {
        if (!isCancelled) {
          setStreakResult({
            streak: null,
            isReliable: false,
            lastUpdated: Date.now(),
          });
        }
      } finally {
        if (!isCancelled) {
          setStreakLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [attendance, studentContext, streakSubjects]);

  const syncDashboard = useCallback(async () => {
    setLoadState("loading");
    setError("");
    setStreakLoading(true);

    try {
      const sessionStatus = await callExtension("GET_SESSION_STATUS", {});
      setSessionCapturedAt(sessionStatus.capturedAt);

      if (!sessionStatus.hasToken) {
        setAttendance(null);
        setUpcomingClasses([]);
        setFutureClasses([]);
        setExpandedDatewise(new Set());
        setDatewiseAttendance({});
        setDatewiseLoading(new Set());
        setDatewiseErrors({});
        setStudentContextOverride(null);
        setShowWholeDayPlanner(false);
        setStreakResult(null);
        setStreakLoading(false);
        setLoadState("idle");
        return;
      }

      const now = new Date();
      const [attendanceData, fetchedStudentInfo] = await Promise.all([
        callExtension("FETCH_ATTENDANCE", {}),
        callExtension("FETCH_STUDENT_ID", {}),
      ]);

      const fetchedWeekSchedules = [];
      for (let weekOffset = 0; weekOffset < FUTURE_WEEKS_TO_FETCH; weekOffset++) {
        fetchedWeekSchedules.push(
          await callExtension("FETCH_SCHEDULE", getWeekRange(now, weekOffset))
        );
      }

      const currentWeekSchedule = fetchedWeekSchedules[0] ?? [];
      const allFutureClasses = getUpcomingClasses(fetchedWeekSchedules.flat());
      const availableBunkDates = new Set(allFutureClasses.map(getScheduleDateKey));

      setAttendance(attendanceData);
      setStudentContextOverride(
        fetchedStudentInfo.studentId === null
          ? null
          : {
              studentId: fetchedStudentInfo.studentId,
              sessionId: fetchedStudentInfo.sessionId,
            },
      );
      setUpcomingClasses(getUpcomingClasses(currentWeekSchedule));
      setFutureClasses(allFutureClasses);
      setSelectedBunkDates((previous) => {
        const next = new Set<string>();

        for (const dateKey of previous) {
          if (availableBunkDates.has(dateKey)) {
            next.add(dateKey);
          }
        }

        return next;
      });
      setLoadState("ready");
    } catch (caughtError) {
      setLoadState("error");
      setAttendance(null);
      setStudentContextOverride(null);
      setUpcomingClasses([]);
      setFutureClasses([]);
      setStreakResult(null);
      setStreakLoading(false);
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    }
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("session")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    let isMounted = true;
    let attempts = 0;

    function checkAndPing() {
      if (!isMounted) return;

      const marker = document.getElementById("kiet-extension-installed");

      if (marker) {
        callExtension("PING", {})
          .then(() => {
            if (!isMounted) return;
            setExtensionDetected(true);
            return syncDashboard();
          })
          .catch((caughtError) => {
            if (!isMounted) return;
            setExtensionDetected(false);
            setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
          });
      } else if (attempts < 15) {
        attempts++;
        setTimeout(checkAndPing, 100);
      } else {
        setExtensionDetected(false);
      }
    }

    checkAndPing();

    return () => {
      isMounted = false;
    };
  }, [syncDashboard]);

  async function handleConnectClick() {
    setError("");

    try {
      await callExtension("PREPARE_LOGIN", {
        targetOrigin: window.location.origin,
      });
      window.location.href = "https://kiet.cybervidya.net/";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    }
  }

  async function handleClearSession() {
    try {
      await callExtension("CLEAR_SESSION", {});
      setAttendance(null);
      setUpcomingClasses([]);
      setFutureClasses([]);
      setPlannedBunks(new Set());
      setExpandedPlanners(new Set());
      setExpandedDatewise(new Set());
      setDatewiseAttendance({});
      setDatewiseLoading(new Set());
      setDatewiseErrors({});
      setStudentContextOverride(null);
      setShowWholeDayPlanner(false);
      setSelectedBunkDates(new Set());
      setSessionCapturedAt(null);
      setStreakResult(null);
      setStreakLoading(false);
      setLoadState("idle");
      window.location.href = "https://kiet.cybervidya.net/?action=logout";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    }
  }

  function handlePlannerToggle(subjectId: string) {
    setExpandedPlanners((previous) => {
      const next = new Set(previous);

      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }

      return next;
    });
  }

  async function handleDatewiseToggle(subject: SubjectSummary) {
    const wasExpanded = expandedDatewise.has(subject.id);

    setExpandedDatewise((previous) => {
      const next = new Set(previous);

      if (next.has(subject.id)) {
        next.delete(subject.id);
      } else {
        next.add(subject.id);
      }

      return next;
    });

    if (wasExpanded || datewiseAttendance[subject.id] || datewiseLoading.has(subject.id)) {
      return;
    }

    if (!studentContext) {
      setDatewiseErrors((previous) => ({
        ...previous,
        [subject.id]:
          "The synced KIET attendance payload did not include a student id yet. Refresh once and try again.",
      }));
      return;
    }

    setDatewiseErrors((previous) => {
      const next = { ...previous };
      delete next[subject.id];
      return next;
    });
    setDatewiseLoading((previous) => new Set(previous).add(subject.id));

    try {
      const response = await callExtension("FETCH_DATEWISE_ATTENDANCE", {
        studentId: studentContext.studentId,
        sessionId: studentContext.sessionId,
        courseId: subject.courseId,
        courseCompId: subject.courseComponentId,
      });

      setDatewiseAttendance((previous) => ({
        ...previous,
        [subject.id]: normalizeDatewiseAttendance(response, subject.extraAttendance),
      }));
    } catch (caughtError) {
      setDatewiseErrors((previous) => ({
        ...previous,
        [subject.id]: caughtError instanceof Error ? caughtError.message : String(caughtError),
      }));
    } finally {
      setDatewiseLoading((previous) => {
        const next = new Set(previous);
        next.delete(subject.id);
        return next;
      });
    }
  }

  function handleBunkToggle(entry: ScheduleEntry) {
    const entryKey = getScheduleEntryKey(entry);

    setPlannedBunks((previous) => {
      const next = new Set(previous);

      if (next.has(entryKey)) {
        next.delete(entryKey);
      } else {
        next.add(entryKey);
      }

      return next;
    });
  }

  function handleWholeDayToggle(dateKey: string) {
    setSelectedBunkDates((previous) => {
      const next = new Set(previous);

      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }

      return next;
    });
  }

  const dashboardData = {
    extensionDetected,
    loadState,
    sessionCapturedAt,
    attendance,
    upcomingClasses,
    streakResult,
    streakLoading,
    error,
    studentContext,
    subjectSummaries,
    overallSummary,
    expandedPlanners,
    expandedDatewise,
    datewiseLoading,
    datewiseErrors,
    datewiseAttendance,
    plannedBunks,
    bunkableDays,
  };

  const dashboardHandlers = {
    handleConnectClick,
    syncDashboard,
    handleClearSession,
    handlePlannerToggle,
    handleDatewiseToggle,
    handleBunkToggle,
  };

  const strategyData = {
    bunkableDays,
    selectedBunkDates,
    selectedBunkCutoffDateKey,
    overallWholeDayPlan,
    wholeDayPlanSummaries,
    overallSummary,
  };

  const strategyHandlers = {
    handleWholeDayToggle,
  };

  const calendarData = {
    upcomingClasses,
  };

  return (
    <main className="app-shell" style={{ minHeight: "100vh", padding: "32px 18px 48px" }}>
      <div className="app-wrap" style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 20 }}>
        
        <nav className="app-nav">
          <Link to="/" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 700, padding: "8px 16px", borderRadius: "12px", background: "#f8fafc", flexShrink: 0, whiteSpace: "nowrap" }}>Dashboard</Link>
          <Link to="/today" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 700, padding: "8px 16px", borderRadius: "12px", background: "#f8fafc", flexShrink: 0, whiteSpace: "nowrap" }}>Today Status</Link>
          <Link to="/strategy" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 700, padding: "8px 16px", borderRadius: "12px", background: "#f8fafc", flexShrink: 0, whiteSpace: "nowrap" }}>Strategy</Link>
          <Link to="/calendar" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 700, padding: "8px 16px", borderRadius: "12px", background: "#f8fafc", flexShrink: 0, whiteSpace: "nowrap" }}>Calendar</Link>
          <Link to="/exam" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 700, padding: "8px 16px", borderRadius: "12px", background: "#f8fafc", flexShrink: 0, whiteSpace: "nowrap" }}>Exam Mode 📚</Link>
          <Link to="/feedback" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 700, padding: "8px 16px", borderRadius: "12px", background: "#f8fafc", flexShrink: 0, whiteSpace: "nowrap" }}>Snitch</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard data={dashboardData} handlers={dashboardHandlers} />} />
          <Route path="/today" element={
            <Suspense fallback={
              <section style={{ display: "grid", gap: 14 }}>
                <div style={{ padding: "24px", borderRadius: 28, background: "#fff", border: "1px solid rgba(15,23,42,0.08)", color: "#64748b" }}>
                  Loading Today's Status...
                </div>
              </section>
            }>
              <TodayStatus attendance={attendance} studentContext={studentContext} />
            </Suspense>
          } />
          <Route path="/strategy" element={<Strategy data={strategyData} handlers={strategyHandlers} />} />
          <Route path="/calendar" element={<CalendarPage data={calendarData} />} />
          <Route path="/exam" element={
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Exam Mode...</div>}>
              <ExamMode />
            </Suspense>
          } />
          <Route path="/feedback" element={<Snitch />} />
          <Route path="/admin-login" element={
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Admin Login...</div>}>
              <AdminLogin />
            </Suspense>
          } />
          <Route path="/admin" element={
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Admin Panel...</div>}>
              <AdminPanel />
            </Suspense>
          } />
        </Routes>

      </div>
      <Analytics />
    </main>
  );
}

export function SetupCard({ hasData }: { hasData: boolean }) {
  return (
    <section className="premium-panel rise-in" style={{ padding: "28px", borderRadius: 28, background: "#ffffff", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 24px 70px rgba(15, 23, 42, 0.06)", display: "grid", gap: 24 }}>
      {!hasData && (
        <div style={{ padding: "14px 18px", borderRadius: 16, background: "#fee2e2", color: "#991b1b", fontSize: 15, fontWeight: 600 }}>
          ⚠️ No attendance data found. Please install the extension and sync from ERP.
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 10px 0" }}>
          🔌 Setup Required (One-Time)
        </h2>
        <p style={{ margin: 0, color: "#475569", fontSize: 16, lineHeight: 1.6 }}>
          The Bunk Helper requires a local Chrome Extension to safely pass KIET sessions securely from your browser to this dashboard.
        </p>
      </div>

      <button
        type="button"
        className="action-button action-button--primary"
        style={{ padding: "14px 28px", alignSelf: "start", justifySelf: "start", background: "#0f172a", color: "#fff", border: "none", borderRadius: 999, fontWeight: 700, cursor: "pointer", fontSize: 15, boxShadow: "0 8px 20px rgba(15, 23, 42, 0.15)" }}
        onClick={() => {
          window.open("/bunk-helper-extension.zip?v=0.1.1", "_blank");
        }}
      >
        ⬇️ Download Extension
      </button>

      <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
        <div style={{ padding: "24px 28px", background: "#f8fafc", borderRadius: 20, border: "1px solid #e2e8f0" }}>
          <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 14, color: "#334155", fontSize: 16, lineHeight: 1.5 }}>
            <li><strong>Download the extension</strong> using the button above.</li>
            <li><strong>Extract the ZIP file</strong> to a permanently stored folder on your computer.</li>
            <li>Open Chrome and go to: <code style={{ background: "#e2e8f0", padding: "4px 8px", borderRadius: 6, fontWeight: 600, color: "#0f172a" }}>chrome://extensions/</code></li>
            <li>Enable the <strong>"Developer Mode"</strong> toggle (top right corner).</li>
            <li>Click <strong>"Load Unpacked"</strong>.</li>
            <li>
              👉 <strong>Select the folder that contains <code>manifest.json</code></strong><br/>
              <span style={{ fontSize: 14, color: "#dc2626", fontWeight: 700, marginTop: 6, display: "inline-block", background: "#fee2e2", padding: "4px 10px", borderRadius: 8 }}>
                (NOT the full project folder if it is nested inside! You must select the specific inner folder containing manifest.json).
              </span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

export function StatusCard({ title, value, tone }: { title: string; value: string; tone: string }) {
  return (
    <div
      className="status-card rise-in"
      style={{
        padding: 16,
        borderRadius: 22,
        background: "rgba(255, 255, 255, 0.88)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
      }}
    >
      <div className="status-label" style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
        {title}
      </div>
      <div className="status-value" style={{ color: tone, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

export function ProgressBar({
  label,
  percentage,
  healthy,
}: {
  label: string;
  percentage: number;
  healthy: boolean;
}) {
  return (
    <div className="progress-meter" style={{ display: "grid", gap: 8 }}>
      <div
        className="progress-meta"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
          color: "#64748b",
        }}
      >
        <span>{label}</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <div
        className="progress-track"
        style={{
          height: 12,
          borderRadius: 999,
          background: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          className="progress-fill"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: "100%",
            background: healthy
              ? "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)"
              : "linear-gradient(90deg, #dc2626 0%, #f97316 100%)",
          }}
        />
      </div>
    </div>
  );
}

export function RecoveryNote({
  recovery,
  cutoffDateKey,
}: {
  recovery: RecoveryInsight;
  cutoffDateKey: string | null;
}) {
  if (recovery.status === "no_selection") {
    return null;
  }

  if (recovery.status === "safe") {
    return (
      <div
        className="recovery-note"
        style={{
          padding: 12,
          borderRadius: 14,
          background: "#dcfce7",
          color: "#166534",
          fontSize: 14,
        }}
      >
        You still stay above 75% after the selected bunk days.
      </div>
    );
  }

  if (recovery.status === "recoverable") {
    return (
      <div
        className="recovery-note"
        style={{
          padding: 12,
          borderRadius: 14,
          background: "#fef3c7",
          color: "#92400e",
          fontSize: 14,
        }}
      >
        Falls below 75% after the selected days, but recovers by{" "}
        <strong>{recovery.recoveryDateLabel}</strong>
        {typeof recovery.recoveryDays === "number" && cutoffDateKey
          ? ` (${recovery.recoveryDays} day${recovery.recoveryDays === 1 ? "" : "s"} later)`
          : ""}
        {typeof recovery.recoveryClasses === "number"
          ? ` after attending ${recovery.recoveryClasses} class${recovery.recoveryClasses === 1 ? "" : "es"}`
          : ""}
        .
      </div>
    );
  }

  return (
    <div
      className="recovery-note"
      style={{
        padding: 12,
        borderRadius: 14,
        background: "#fee2e2",
        color: "#991b1b",
        fontSize: 14,
      }}
    >
      This plan drops attendance below 75%, and it does not recover within the loaded{" "}
      {FUTURE_WEEKS_TO_FETCH}-week schedule horizon.
    </div>
  );
}


export function Notice({
  tone,
  background,
  children,
}: {
  tone: string;
  background: string;
  children: ReactNode;
}) {
  return (
    <div
      className="notice-banner"
      style={{
        padding: "12px 14px",
        borderRadius: 16,
        color: tone,
        background,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-chip">
      <div className="metric-label" style={{ fontSize: 12, color: "#64748b" }}>
        {label}
      </div>
      <div className="metric-value" style={{ fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}



export function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    border: "none",
    borderRadius: 999,
    padding: "12px 20px",
    background: disabled
      ? "linear-gradient(135deg, rgba(148, 163, 184, 0.72), rgba(203, 213, 225, 0.96))"
      : "linear-gradient(135deg, #0b3b66 0%, #0f766e 52%, #2563eb 100%)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    boxShadow: disabled ? "none" : "0 14px 30px rgba(37, 99, 235, 0.18)",
  };
}

export const secondaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(15, 23, 42, 0.12)",
  borderRadius: 999,
  padding: "12px 20px",
  background: "rgba(255, 255, 255, 0.82)",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 600,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
};

export function AttendanceSniper({ data, schedule }: { data: OverallSummary | null; schedule: BunkableDay[] }) {
  const [targetInput, setTargetInput] = useState<string>("");
  const [result, setResult] = useState<{
    target: number;
    belowPercent: number;
    belowTotal: number;
    belowPresent: number;
    abovePercent: number;
    aboveTotal: number;
    abovePresent: number;
  } | null>(null);

  function mapClassesToDate(classesNeeded: number) {
    if (classesNeeded <= 0 || !schedule || schedule.length === 0) return null;
    let sum = 0;
    for (const day of schedule) {
      sum += day.entries.length;
      if (sum >= classesNeeded) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(day.dateKey);
        targetDate.setHours(0, 0, 0, 0);
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
        return { label: day.label, days: diffDays };
      }
    }
    return { label: "Outside loaded schedule", days: -1 };
  }

  function handleCalculate() {
    if (!data) return;
    const target = parseFloat(targetInput);
    if (isNaN(target) || target < 0 || target > 100) return;

    const p = data.present;
    const t = data.total;
    const current = t === 0 ? 0 : (p / t) * 100;

    if (Math.abs(current - target) < 0.001 || t === 0) {
      setResult({
        target,
        belowPercent: current,
        belowTotal: t,
        belowPresent: p,
        abovePercent: current,
        aboveTotal: t,
        abovePresent: p,
      });
      return;
    }

    let belowP = p;
    let belowT = t;
    let aboveP = p;
    let aboveT = t;

    if (target > current) {
      let iterP = p;
      let iterT = t;
      let prevP = p;
      let prevT = t;
      let iterations = 0;
      while ((iterP / iterT) * 100 < target && iterations < 1000) {
        prevP = iterP;
        prevT = iterT;
        iterP += 1;
        iterT += 1;
        iterations++;
      }
      belowP = prevP;
      belowT = prevT;
      aboveP = iterP;
      aboveT = iterT;
    } else {
      let iterP = p;
      let iterT = t;
      let prevT = t;
      let iterations = 0;
      while ((iterP / iterT) * 100 > target && iterations < 1000) {
        prevT = iterT;
        iterT += 1;
        iterations++;
      }
      belowP = iterP;
      belowT = iterT;
      aboveP = iterP;
      aboveT = prevT;
    }

    setResult({
      target,
      belowPercent: belowT === 0 ? 0 : (belowP / belowT) * 100,
      belowTotal: belowT,
      belowPresent: belowP,
      abovePercent: aboveT === 0 ? 0 : (aboveP / aboveT) * 100,
      aboveTotal: aboveT,
      abovePresent: aboveP,
    });
  }

  if (!data) return null;

  const currentPercent = data.total === 0 ? 0 : (data.present / data.total) * 100;

  return (
    <Panel title="Attendance Sniper 🎯" subtitle="Set a precise target percentage and strictly calculate the exact classes to attend or miss safely.">
      <div className="surface-card surface-card--highlight rise-in" style={{ padding: "20px 24px", display: "grid", gap: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Target Percentage (%)</label>
            <input 
              type="number" 
              value={targetInput} 
              onChange={e => setTargetInput(e.target.value)} 
              placeholder="e.g. 92"
              min="0"
              max="100"
              style={{ padding: "10px 14px", borderRadius: 10, border: "2px solid #cbd5e1", fontSize: 16, width: "100%", background: "#ffffff", outline: "none", color: "#0f172a", fontWeight: "600" }}
            />
          </div>
          <button 
            type="button" 
            className="action-button action-button--primary" 
            onClick={handleCalculate}
            style={{ padding: "12px 24px" }}
          >
            Calculate Strategy
          </button>
        </div>

        {result && (
          <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>🎯 Target: {result.target}% (Current: {currentPercent.toFixed(1)}%)</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div className="surface-card" style={{ padding: 18, display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>📉 Closest Below</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{result.belowPercent.toFixed(2)}%</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.4, marginTop: 4 }}>
                  {result.belowPresent} attended out of {result.belowTotal} classes.<br/>
                  <strong style={{ color: result.target > currentPercent ? "#64748b" : "#dc2626" }}>
                    {(() => {
                      const diff = result.belowTotal - data.total;
                      if (diff <= 0) return "(Exact match or 0 change)";
                      const dateMap = mapClassesToDate(diff);
                      if (!dateMap) return `(+${diff} classes)`;
                      if (dateMap.days === -1) return "Exceeds 12-week schedule boundary";
                      return `Hits margin on ${dateMap.label} (${dateMap.days} days)`;
                    })()}
                  </strong>
                </div>
              </div>

              <div className="surface-card" style={{ padding: 18, display: "grid", gap: 8, border: "2px solid rgba(59, 130, 246, 0.4)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📈 Closest Above {result.target > currentPercent ? "(Required)" : "(Safe)"}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#1d4ed8", lineHeight: 1 }}>{result.abovePercent.toFixed(2)}%</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.4, marginTop: 4 }}>
                  {result.abovePresent} attended out of {result.aboveTotal} classes.<br/>
                  <strong style={{ color: result.target > currentPercent ? "#16a34a" : "#64748b" }}>
                    {(() => {
                      const diff = result.aboveTotal - data.total;
                      if (diff <= 0) return "(Exact match or 0 change)";
                      const dateMap = mapClassesToDate(diff);
                      if (!dateMap) return `(+${diff} classes)`;
                      if (dateMap.days === -1) return "Exceeds 12-week schedule boundary";
                      return `Hits margin on ${dateMap.label} (${dateMap.days} days)`;
                    })()}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function incrementCount(counter: Map<string, number>, key: string) {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

export function formatPercentageDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pts`;
}

export function formatStreakMetricValue(result: StreakResult | null, isLoading: boolean): string {
  if (isLoading || !result) {
    return "Loading...";
  }

  if (!result.isReliable || result.streak === null) {
    return "Data syncing…";
  }

  if (result.streak === 0) {
    return "0 days 😭";
  }

  return `${result.streak} day${result.streak === 1 ? "" : "s"} in a row 🚀`;
}

function getStudentContext(attendance: StudentDetails | null): StudentContext | null {
  if (!attendance) {
    return null;
  }

  const studentId = attendance.studentId;

  if (studentId === null || studentId === undefined || studentId === "") {
    return null;
  }

  return {
    studentId,
    sessionId: attendance.sessionId ?? null,
  };
}

function normalizeDatewiseAttendance(
  buckets: DatewiseAttendanceBucket[],
  fallbackExtraAttendance: number,
): DatewiseAttendanceState {
  const lectures = buckets
    .flatMap((bucket) => bucket.lectureList ?? [])
    .filter((lecture) => Boolean(lecture.planLecDate || lecture.timeSlot || lecture.attendance));
  const dedupedLectures = new Map<string, DatewiseAttendanceLecture>();

  for (const lecture of lectures) {
    const key = [
      lecture.planLecDate ?? "unknown-date",
      lecture.timeSlot ?? "unknown-slot",
      lecture.attendance ?? "unknown-status",
      lecture.lectureType ?? "unknown-type",
    ].join(":");

    if (!dedupedLectures.has(key)) {
      dedupedLectures.set(key, lecture);
    }
  }

  const lectureCount = buckets.reduce((sum, bucket) => sum + (bucket.lectureCount ?? 0), 0);
  const presentCount = buckets.reduce((sum, bucket) => sum + (bucket.presentCount ?? 0), 0);
  const extraAttendanceFromApi = buckets.reduce(
    (sum, bucket) => sum + (bucket.numberOfExtraAttendance ?? 0),
    0,
  );
  const extraAttendance =
    extraAttendanceFromApi > 0 ? extraAttendanceFromApi : fallbackExtraAttendance;
  const apiPercent = buckets.find((bucket) => typeof bucket.percent === "number")?.percent ?? null;
  const effectivePercent =
    apiPercent ??
    (lectureCount > 0 ? ((presentCount + extraAttendance) / lectureCount) * 100 : 0);

  return {
    lectureCount,
    presentCount,
    extraAttendance,
    percent: effectivePercent,
    lectures: Array.from(dedupedLectures.values()).sort(compareDatewiseLectures),
  };
}

function compareDatewiseLectures(
  left: DatewiseAttendanceLecture,
  right: DatewiseAttendanceLecture,
): number {
  const leftDate = left.planLecDate ? new Date(left.planLecDate).getTime() : 0;
  const rightDate = right.planLecDate ? new Date(right.planLecDate).getTime() : 0;

  if (leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  return getTimeSlotSortValue(right.timeSlot) - getTimeSlotSortValue(left.timeSlot);
}

function getTimeSlotSortValue(timeSlot: string | null): number {
  if (!timeSlot) {
    return -1;
  }

  const startLabel = timeSlot.split("-")[0]?.trim();

  if (!startLabel) {
    return -1;
  }

  const match = startLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return -1;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) {
    hours += 12;
  } else if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export function formatDatewiseLectureDate(planLecDate: string | null, dayName: string | null): string {
  if (!planLecDate) {
    return dayName ?? "Date unavailable";
  }

  const [year, month, day] = planLecDate.split("-").map(Number);

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function getAttendanceStatusTheme(status: string | null): { background: string; color: string } {
  switch (normalizeIdentifier(status)) {
    case "PRESENT":
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    case "ADJUSTED":
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
    case "ABSENT":
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    default:
      return {
        background: "#e2e8f0",
        color: "#334155",
      };
  }
}

export function getScheduleEntryKey(entry: ScheduleEntry): string {
  return [
    normalizeIdentifier(entry.courseCode),
    normalizeIdentifier(entry.courseCompName),
    entry.start,
    entry.end,
  ].join(":");
}

function getScheduleDateKey(entry: ScheduleEntry): string {
  const date = parseKietDateTime(entry.start);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateKeyLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getDayDifference(startDateKey: string, endDateKey: string): number {
  const [startYear, startMonth, startDay] = startDateKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDateKey.split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function compareScheduleEntriesByStart(left: ScheduleEntry, right: ScheduleEntry): number {
  return parseKietDateTime(left.start).getTime() - parseKietDateTime(right.start).getTime();
}

function buildWholeDayPlan(
  present: number,
  total: number,
  relevantClasses: ScheduleEntry[],
  selectedDateKeys: Set<string>,
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

function getMatchingUpcomingClasses(
  courseCode: string,
  componentName: string,
  componentCount: number,
  upcomingClasses: ScheduleEntry[],
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

export default App;
