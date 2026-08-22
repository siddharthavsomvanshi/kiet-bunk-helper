import { useMemo, useState } from "react";
import type { StudentContext, SubjectSummary } from "../App";
import { EmptyMessage, Panel } from "../components/UI";
import type { DatewiseAttendanceBucket, DatewiseAttendanceLecture, ScheduleEntry } from "../types/kiet";
import { callExtension } from "../utils/bridge";
import { formatIsoDate, getWeekRange, parseKietDateTime } from "../utils/date";

type HistoryRow = {
  key: string;
  subject: string;
  component: string;
  status: string | null;
};

type AttendanceHistoryData = {
  selectedDate: string;
  rows: HistoryRow[];
};

function normalise(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getDateKey(entry: ScheduleEntry): string {
  return formatIsoDate(parseKietDateTime(entry.start));
}

function sameScheduleDate(entry: ScheduleEntry, dateKey: string): boolean {
  return entry.type === "CLASS" && getDateKey(entry) === dateKey;
}

function formatSelectedDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getStatusStyle(status: string | null) {
  switch (normalise(status)) {
    case "PRESENT":
      return { label: "Present", color: "var(--success)", background: "var(--success-soft)" };
    case "ABSENT":
      return { label: "Absent", color: "var(--danger)", background: "var(--danger-soft)" };
    case "ADJUSTED":
      return { label: "Adjusted", color: "var(--warning)", background: "var(--warning-soft)" };
    default:
      return { label: "Not marked", color: "var(--secondary)", background: "var(--secondary-soft)" };
  }
}

function getScheduleSubject(entry: ScheduleEntry, subjects: SubjectSummary[]): SubjectSummary | null {
  const courseCode = normalise(entry.courseCode);
  const matchingCourse = subjects.filter((subject) => normalise(subject.courseCode) === courseCode);

  if (matchingCourse.length === 1) {
    return matchingCourse[0];
  }

  const componentName = normalise(entry.courseCompName);
  return matchingCourse.find((subject) => normalise(subject.componentName) === componentName) ?? null;
}

function getLectureForClass(
  lectures: DatewiseAttendanceLecture[],
  entry: ScheduleEntry,
  dateKey: string,
): DatewiseAttendanceLecture | null {
  const onDate = lectures.filter((lecture) => lecture.planLecDate?.slice(0, 10) === dateKey);
  if (onDate.length === 0) {
    return null;
  }

  const start = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parseKietDateTime(entry.start)).toUpperCase();

  return onDate.find((lecture) => lecture.timeSlot?.toUpperCase().includes(start)) ?? onDate[0];
}

export function AttendanceHistory({
  studentContext,
  subjects,
  knownSchedule,
}: {
  studentContext: StudentContext | null;
  subjects: SubjectSummary[];
  knownSchedule: ScheduleEntry[];
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [history, setHistory] = useState<AttendanceHistoryData | null>(null);
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [error, setError] = useState("");
  const todayKey = formatIsoDate(new Date());

  const knownClassDates = useMemo(
    () => new Set(knownSchedule.filter((entry) => entry.type === "CLASS").map(getDateKey)),
    [knownSchedule],
  );

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const count = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: firstWeekday + count }, (_, index) => {
      if (index < firstWeekday) return null;
      const date = new Date(year, monthIndex, index - firstWeekday + 1);
      return { day: date.getDate(), dateKey: formatIsoDate(date) };
    });
  }, [month]);

  async function selectDate(dateKey: string) {
    if (!studentContext || dateKey > todayKey || loadingDate) return;

    setLoadingDate(dateKey);
    setError("");
    setHistory(null);

    try {
      // Schedule is fetched only after a date is chosen. It determines exactly
      // which course components need attendance records for that one date.
      const schedule = await callExtension("FETCH_SCHEDULE", getWeekRange(new Date(`${dateKey}T00:00:00`)));
      const scheduledClasses = schedule.filter((entry) => sameScheduleDate(entry, dateKey));
      const subjectsById = new Map<string, SubjectSummary>();

      for (const entry of scheduledClasses) {
        const subject = getScheduleSubject(entry, subjects);
        if (subject) subjectsById.set(subject.id, subject);
      }

      const attendanceBySubject = new Map<string, DatewiseAttendanceLecture[]>();
      await Promise.all(
        Array.from(subjectsById.values()).map(async (subject) => {
          const buckets = await callExtension("FETCH_DATEWISE_ATTENDANCE", {
            studentId: studentContext.studentId,
            sessionId: studentContext.sessionId,
            courseId: subject.courseId,
            courseCompId: subject.courseComponentId,
          });
          attendanceBySubject.set(
            subject.id,
            (buckets as DatewiseAttendanceBucket[]).flatMap((bucket) => bucket.lectureList ?? []),
          );
        }),
      );

      const rows = scheduledClasses.map((entry, index) => {
        const subject = getScheduleSubject(entry, subjects);
        const lecture = subject
          ? getLectureForClass(attendanceBySubject.get(subject.id) ?? [], entry, dateKey)
          : null;

        return {
          key: `${entry.courseCode ?? "class"}-${entry.start}-${index}`,
          subject: subject?.title ?? entry.courseName ?? entry.title,
          component: subject?.componentName ?? entry.courseCompName ?? "Class",
          status: lecture?.attendance ?? null,
        };
      });

      setHistory({ selectedDate: dateKey, rows });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setLoadingDate(null);
    }
  }

  const presentCount = history?.rows.filter((row) => normalise(row.status) === "PRESENT").length ?? 0;
  const absentCount = history?.rows.filter((row) => normalise(row.status) === "ABSENT").length ?? 0;
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(month);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel title="Attendance History" subtitle="Choose a past date to load attendance for that day.">
        {!studentContext ? (
          <EmptyMessage message="Connect KIET on the dashboard first." />
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <button className="action-button action-button--secondary" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</button>
              <strong style={{ fontSize: 17 }}>{monthLabel}</strong>
              <button className="action-button action-button--secondary" type="button" disabled={month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth()} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontWeight: 700 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
              {calendarDays.map((calendarDay, index) => {
                if (!calendarDay) return <span key={`blank-${index}`} />;
                const isFuture = calendarDay.dateKey > todayKey;
                const isSelected = history?.selectedDate === calendarDay.dateKey;
                return <button key={calendarDay.dateKey} type="button" disabled={isFuture} onClick={() => void selectDate(calendarDay.dateKey)} aria-label={`Load attendance for ${calendarDay.dateKey}`} style={{ minHeight: 44, borderRadius: 12, border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--primary-soft)' : 'var(--bg-card-subtle)', color: isFuture ? 'var(--text-muted)' : 'var(--text-primary)', cursor: isFuture ? 'not-allowed' : 'pointer', font: 'inherit', fontWeight: 700, opacity: isFuture ? 0.45 : 1 }}>
                  {calendarDay.day}{knownClassDates.has(calendarDay.dateKey) && <span aria-hidden="true" style={{ display: 'block', color: 'var(--primary)', lineHeight: 0.5 }}>•</span>}
                </button>;
              })}
            </div>
          </div>
        )}
      </Panel>

      {loadingDate && <Panel title="Loading attendance" subtitle={`Getting classes and attendance for ${formatSelectedDate(loadingDate)}.`}><EmptyMessage message="Loading only the selected date..." /></Panel>}
      {error && <Panel title="Attendance History" subtitle="The selected date could not be loaded."><EmptyMessage message={error} /></Panel>}
      {history && !loadingDate && !error && (
        <Panel title={formatSelectedDate(history.selectedDate)} subtitle="Attendance marked for your scheduled classes.">
          {history.rows.length === 0 ? <EmptyMessage message="No scheduled classes were found for this date." /> : <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontWeight: 700 }}><span style={{ color: 'var(--success)' }}>Present: {presentCount}</span><span style={{ color: 'var(--danger)' }}>Absent: {absentCount}</span></div>
            {history.rows.map((row) => { const status = getStatusStyle(row.status); return <div key={row.key} className="standard-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div style={{ minWidth: 0 }}><strong>{row.subject}</strong><div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>{row.component}</div></div><span style={{ flexShrink: 0, color: status.color, background: status.background, borderRadius: 999, padding: '6px 10px', fontWeight: 800, fontSize: 13 }}>{status.label}</span></div>; })}
          </div>}
        </Panel>
      )}
    </section>
  );
}
