import React, { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyMessage, Notice, Panel, StatusCard, secondaryButtonStyle } from "../App";
import type { LoadState, StudentContext } from "../App";
import type {
  DatewiseAttendanceBucket,
  DatewiseAttendanceLecture,
  ScheduleEntry,
  StudentDetails,
} from "../types/kiet";
import { callExtension } from "../utils/bridge";
import {
  formatIsoDate,
  formatScheduleDay,
  formatScheduleTime,
  getWeekRange,
  parseKietDateTime,
} from "../utils/date";

export interface TodayStatusPageProps {
  attendance: StudentDetails | null;
  studentContext: StudentContext | null;
  extensionDetected: boolean;
  loadState: LoadState;
}

type TodayClassStatus = "present" | "absent" | "not_marked" | "not_available";

type TodayClass = {
  id: string;
  entry: ScheduleEntry;
  courseId: number | null;
  courseComponentId: number | null;
  componentKey: string | null;
  status: TodayClassStatus;
};

type IndexedComponent = {
  componentName: string;
  courseComponentId: number;
};

type IndexedCourse = {
  courseId: number;
  componentCount: number;
  components: IndexedComponent[];
};

type TodayStatusCache = {
  cacheKey: string;
  schedule: ScheduleEntry[] | null;
  attendanceByComponent: Record<string, DatewiseAttendanceBucket[]>;
  classes: TodayClass[] | null;
};

type TodaySummary = {
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  notMarkedCount: number;
};

const ENTRY_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

let moduleTodayStatusCache: TodayStatusCache | null = null;

function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getCacheKey(studentContext: StudentContext, todayDateIso: string): string {
  return `${studentContext.studentId}:${studentContext.sessionId ?? "no-session"}:${todayDateIso}`;
}

function getCacheState(cacheKey: string, forceRefresh: boolean): TodayStatusCache {
  if (!moduleTodayStatusCache || moduleTodayStatusCache.cacheKey !== cacheKey || forceRefresh) {
    moduleTodayStatusCache = {
      cacheKey,
      schedule: null,
      attendanceByComponent: {},
      classes: null,
    };
  }

  return moduleTodayStatusCache;
}

function buildCourseIndex(attendance: StudentDetails): Map<string, IndexedCourse> {
  return new Map(
    attendance.attendanceCourseComponentInfoList.map((course) => [
      normalizeIdentifier(course.courseCode),
      {
        courseId: course.courseId,
        componentCount: course.attendanceCourseComponentNameInfoList.length,
        components: course.attendanceCourseComponentNameInfoList.map((component) => ({
          componentName: component.componentName,
          courseComponentId: component.courseComponentId,
        })),
      },
    ]),
  );
}

function getTodayEntries(schedule: ScheduleEntry[], todayDateIso: string): ScheduleEntry[] {
  return schedule
    .filter((entry) => {
      if (entry.type !== "CLASS") {
        return false;
      }

      return formatIsoDate(parseKietDateTime(entry.start)) === todayDateIso;
    })
    .sort(
      (left, right) =>
        parseKietDateTime(left.start).getTime() - parseKietDateTime(right.start).getTime(),
    );
}

function resolveComponentForEntry(
  entry: ScheduleEntry,
  courseIndex: Map<string, IndexedCourse>,
): { courseId: number | null; courseComponentId: number | null; componentKey: string | null } {
  const indexedCourse = courseIndex.get(normalizeIdentifier(entry.courseCode));

  if (!indexedCourse) {
    return {
      courseId: null,
      courseComponentId: null,
      componentKey: null,
    };
  }

  const matchedComponent =
    indexedCourse.componentCount <= 1
      ? indexedCourse.components[0] ?? null
      : indexedCourse.components.find(
          (component) =>
            normalizeIdentifier(component.componentName) === normalizeIdentifier(entry.courseCompName),
        ) ?? null;

  if (!matchedComponent) {
    return {
      courseId: indexedCourse.courseId,
      courseComponentId: null,
      componentKey: null,
    };
  }

  return {
    courseId: indexedCourse.courseId,
    courseComponentId: matchedComponent.courseComponentId,
    componentKey: `${indexedCourse.courseId}:${matchedComponent.courseComponentId}`,
  };
}

function getLectureStartLabel(timeSlot: string | null): string | null {
  if (!timeSlot) {
    return null;
  }

  const [startLabel] = timeSlot.split("-");
  return startLabel ? startLabel.trim().toUpperCase().replace(/\s+/g, " ") : null;
}

function getEntryStartLabel(entry: ScheduleEntry): string {
  return ENTRY_TIME_FORMATTER.format(parseKietDateTime(entry.start))
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function getClockSortValue(label: string | null): number {
  if (!label) {
    return Number.MAX_SAFE_INTEGER;
  }

  const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
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

function compareLecturesByTime(left: DatewiseAttendanceLecture, right: DatewiseAttendanceLecture): number {
  return (
    getClockSortValue(getLectureStartLabel(left.timeSlot)) -
    getClockSortValue(getLectureStartLabel(right.timeSlot))
  );
}

function consumeMatchingLecture(
  entry: ScheduleEntry,
  remainingLectures: DatewiseAttendanceLecture[],
): DatewiseAttendanceLecture | null {
  const entryStartLabel = getEntryStartLabel(entry);
  const exactMatchIndex = remainingLectures.findIndex(
    (lecture) => getLectureStartLabel(lecture.timeSlot) === entryStartLabel,
  );

  if (exactMatchIndex >= 0) {
    return remainingLectures.splice(exactMatchIndex, 1)[0] ?? null;
  }

  return remainingLectures.shift() ?? null;
}

function resolveStatus(lecture: DatewiseAttendanceLecture | null): TodayClassStatus {
  if (!lecture) {
    return "not_available";
  }

  const normalizedAttendance = normalizeIdentifier(lecture.attendance);

  if (normalizedAttendance === "PRESENT" || normalizedAttendance === "ADJUSTED") {
    return "present";
  }

  if (normalizedAttendance === "ABSENT") {
    return "absent";
  }

  if (!normalizedAttendance || normalizedAttendance === "NULL") {
    return "not_marked";
  }

  return "not_available";
}

function resolveTodayClasses(
  baseClasses: TodayClass[],
  attendanceByComponent: Record<string, DatewiseAttendanceBucket[]>,
  todayDateIso: string,
): TodayClass[] {
  const resolvedClasses = baseClasses.map((todayClass) => ({
    ...todayClass,
    status: "not_available" as const,
  }));
  const classIndexesByComponent = new Map<string, number[]>();

  baseClasses.forEach((todayClass, index) => {
    if (!todayClass.componentKey) {
      return;
    }

    const existingIndexes = classIndexesByComponent.get(todayClass.componentKey) ?? [];
    existingIndexes.push(index);
    classIndexesByComponent.set(todayClass.componentKey, existingIndexes);
  });

  for (const [componentKey, classIndexes] of classIndexesByComponent.entries()) {
    const buckets = attendanceByComponent[componentKey];

    if (!buckets) {
      continue;
    }

    const remainingLectures = buckets
      .flatMap((bucket) => bucket.lectureList ?? [])
      .filter((lecture) => lecture.planLecDate === todayDateIso)
      .sort(compareLecturesByTime);

    const sortedClassIndexes = [...classIndexes].sort(
      (leftIndex, rightIndex) =>
        parseKietDateTime(baseClasses[leftIndex].entry.start).getTime() -
        parseKietDateTime(baseClasses[rightIndex].entry.start).getTime(),
    );

    for (const classIndex of sortedClassIndexes) {
      resolvedClasses[classIndex] = {
        ...resolvedClasses[classIndex],
        status: resolveStatus(
          consumeMatchingLecture(baseClasses[classIndex].entry, remainingLectures),
        ),
      };
    }
  }

  return resolvedClasses;
}

function getStatusPresentation(status: TodayClassStatus): {
  label: string;
  background: string;
  color: string;
} {
  switch (status) {
    case "present":
      return {
        label: "\u2714 Present",
        background: "#dcfce7",
        color: "#166534",
      };
    case "absent":
      return {
        label: "\u274c Absent",
        background: "#fee2e2",
        color: "#991b1b",
      };
    case "not_marked":
      return {
        label: "\u23f3 Not Marked",
        background: "#fef3c7",
        color: "#92400e",
      };
    default:
      return {
        label: "Not Available",
        background: "#e2e8f0",
        color: "#334155",
      };
  }
}

export function TodayStatusPage({
  attendance,
  studentContext,
  extensionDetected,
  loadState,
}: TodayStatusPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);

  const todayDateIso = useMemo(() => formatIsoDate(new Date()), []);
  const cacheKey = useMemo(
    () => (studentContext ? getCacheKey(studentContext, todayDateIso) : null),
    [studentContext, todayDateIso],
  );

  const fetchTodayData = useCallback(
    async (forceRefresh = false) => {
      if (!attendance || !studentContext || !cacheKey) {
        return;
      }

      setIsLoading(true);
      setMessage(null);

      const cache = getCacheState(cacheKey, forceRefresh);

      if (!forceRefresh && cache.classes) {
        setTodayClasses(cache.classes);
        setIsLoading(false);
        return;
      }

      try {
        let currentWeekSchedule = cache.schedule;

        if (!currentWeekSchedule) {
          currentWeekSchedule = await callExtension("FETCH_SCHEDULE", getWeekRange(new Date(), 0));
          cache.schedule = currentWeekSchedule;
        }

        const entriesToday = getTodayEntries(currentWeekSchedule, todayDateIso);
        const courseIndex = buildCourseIndex(attendance);
        const baseClasses = entriesToday.map((entry, index) => {
          const componentMatch = resolveComponentForEntry(entry, courseIndex);

          return {
            id: `${entry.courseCode ?? "na"}:${entry.courseCompName ?? "na"}:${entry.start}:${entry.end}:${index}`,
            entry,
            courseId: componentMatch.courseId,
            courseComponentId: componentMatch.courseComponentId,
            componentKey: componentMatch.componentKey,
            status: "not_available" as const,
          };
        });
        const uniqueComponentKeys = Array.from(
          new Set(
            baseClasses.flatMap((todayClass) =>
              todayClass.componentKey ? [todayClass.componentKey] : [],
            ),
          ),
        );

        const fetchResults = await Promise.allSettled(
          uniqueComponentKeys.map(async (componentKey) => {
            if (cache.attendanceByComponent[componentKey]) {
              return;
            }

            const [courseId, courseComponentId] = componentKey.split(":").map(Number);
            const response = await callExtension("FETCH_DATEWISE_ATTENDANCE", {
              studentId: studentContext.studentId,
              sessionId: studentContext.sessionId,
              courseId,
              courseCompId: courseComponentId,
            });

            cache.attendanceByComponent[componentKey] = response;
          }),
        );

        const resolvedClasses = resolveTodayClasses(
          baseClasses,
          cache.attendanceByComponent,
          todayDateIso,
        );

        cache.classes = resolvedClasses;
        setTodayClasses(resolvedClasses);

        if (fetchResults.some((result) => result.status === "rejected")) {
          setMessage(
            "Some attendance marks could not be loaded. Affected classes are shown as Not Available.",
          );
        }
      } catch (caughtError) {
        setMessage(caughtError instanceof Error ? caughtError.message : String(caughtError));
      } finally {
        setIsLoading(false);
      }
    },
    [attendance, cacheKey, studentContext, todayDateIso],
  );

  useEffect(() => {
    setTodayClasses([]);
    setMessage(null);
  }, [cacheKey]);

  useEffect(() => {
    if (!attendance || !studentContext || !cacheKey) {
      return;
    }

    void fetchTodayData();
  }, [attendance, cacheKey, fetchTodayData, studentContext]);

  const summary = useMemo<TodaySummary>(
    () =>
      todayClasses.reduce<TodaySummary>(
        (counts, todayClass) => {
          counts.totalClasses += 1;

          if (todayClass.status === "present") {
            counts.presentCount += 1;
          } else if (todayClass.status === "absent") {
            counts.absentCount += 1;
          } else if (todayClass.status === "not_marked") {
            counts.notMarkedCount += 1;
          }

          return counts;
        },
        {
          totalClasses: 0,
          presentCount: 0,
          absentCount: 0,
          notMarkedCount: 0,
        },
      ),
    [todayClasses],
  );

  if (!extensionDetected) {
    return (
      <section style={{ display: "grid", gap: 14 }}>
        <Panel
          title="Today Status"
          subtitle="This page fetches only today's classes when you open it."
        >
          <Notice tone="#991b1b" background="#fee2e2">
            Install or enable the KIET extension to load today's attendance marks.
          </Notice>
        </Panel>
      </section>
    );
  }

  if (!attendance || !studentContext) {
    return (
      <section style={{ display: "grid", gap: 14 }}>
        <Panel
          title="Today Status"
          subtitle="This page fetches only today's classes when you open it."
        >
          {loadState === "loading" ? (
            <EmptyMessage message="Waiting for your KIET session to finish syncing..." />
          ) : (
            <Notice tone="#92400e" background="#fef3c7">
              Connect to KIET ERP and sync once before opening Today Status.
            </Notice>
          )}
        </Panel>
      </section>
    );
  }

  return (
    <div className="rise-in" style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#0f172a" }}>
          {"\u{1F4C5} Today Status"}
        </h1>
        <button
          className="action-button action-button--secondary"
          type="button"
          onClick={() => void fetchTodayData(true)}
          disabled={isLoading}
          style={{
            ...secondaryButtonStyle,
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? "progress" : "pointer",
          }}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message ? (
        <Notice
          tone={message.includes("Not Available") ? "#92400e" : "#991b1b"}
          background={message.includes("Not Available") ? "#fef3c7" : "#fee2e2"}
        >
          {message}
        </Notice>
      ) : null}

      {isLoading && summary.totalClasses === 0 ? (
        <Panel
          title="Today Status"
          subtitle="Fetching the current week schedule and today's subject-wise marks."
        >
          <EmptyMessage message="Loading today's classes..." />
        </Panel>
      ) : null}

      {!isLoading && summary.totalClasses === 0 && !message ? (
        <Panel title="No Classes Today" subtitle="No class entries were found in the current week schedule.">
          <EmptyMessage message="You have no classes scheduled for today." />
        </Panel>
      ) : null}

      {summary.totalClasses > 0 ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <StatusCard title="Total Classes" value={String(summary.totalClasses)} tone="#0f172a" />
            <StatusCard title="Present" value={String(summary.presentCount)} tone="#166534" />
            <StatusCard title="Absent" value={String(summary.absentCount)} tone="#991b1b" />
            <StatusCard title="Not Marked" value={String(summary.notMarkedCount)} tone="#92400e" />
          </div>

          {summary.absentCount > 0 || summary.notMarkedCount > 0 ? (
            <Panel title="Issues" subtitle="Warnings based on today's attendance marks.">
              <div style={{ display: "grid", gap: 10 }}>
                {summary.absentCount > 0 ? (
                  <Notice tone="#991b1b" background="#fee2e2">
                    {summary.absentCount} class{summary.absentCount === 1 ? "" : "es"} marked absent.
                  </Notice>
                ) : null}
                {summary.notMarkedCount > 0 ? (
                  <Notice tone="#92400e" background="#fef3c7">
                    {summary.notMarkedCount} class{summary.notMarkedCount === 1 ? "" : "es"} not yet marked.
                  </Notice>
                ) : null}
              </div>
            </Panel>
          ) : null}

          <Panel title="Class List" subtitle="Subject-wise attendance status for today's classes.">
            <div style={{ display: "grid", gap: 12 }}>
              {todayClasses.map((todayClass) => {
                const statusPresentation = getStatusPresentation(todayClass.status);
                const subjectLabel =
                  todayClass.entry.courseCode ??
                  todayClass.entry.courseName ??
                  todayClass.entry.title;
                const secondaryDetails = [
                  todayClass.entry.courseName && todayClass.entry.courseName !== subjectLabel
                    ? todayClass.entry.courseName
                    : null,
                  todayClass.entry.courseCompName ?? null,
                  formatScheduleDay(todayClass.entry.start),
                  `${formatScheduleTime(todayClass.entry.start)} - ${formatScheduleTime(todayClass.entry.end)}`,
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <div
                    key={todayClass.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 16,
                      borderRadius: 16,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      background: "#fff",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
                        {subjectLabel}
                      </div>
                      <div style={{ fontSize: 14, color: "#64748b" }}>{secondaryDetails}</div>
                    </div>

                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: statusPresentation.background,
                        color: statusPresentation.color,
                        fontWeight: 700,
                        fontSize: 14,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusPresentation.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
