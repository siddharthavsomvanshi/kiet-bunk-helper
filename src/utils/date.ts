import type { ScheduleEntry } from "../types/kiet";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekRange(baseDate: Date, weekOffset = 0) {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + weekOffset * 7);

  const dayIndex = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayIndex);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    weekStartDate: formatIsoDate(start),
    weekEndDate: formatIsoDate(end),
  };
}

export function parseKietDateTime(value: string): Date {
  const [datePart, timePart] = value.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours, minutes, seconds] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function getUpcomingClasses(entries: ScheduleEntry[]): ScheduleEntry[] {
  const now = Date.now();
  const seen = new Set<string>();

  // 1. Identify any dates that have exams planned.
  const examDates = new Set<string>();
  for (const entry of entries) {
    const isExam = [entry.title, entry.courseName, entry.type].some(
      val => val && String(val).toLowerCase().includes("exam")
    );
    if (isExam) {
      examDates.add(formatIsoDate(parseKietDateTime(entry.start)));
    }
  }

  return entries
    .filter((entry) => {
      // 2. Exclude ANY event occurring on an exam date
      const eventDate = formatIsoDate(parseKietDateTime(entry.start));
      if (examDates.has(eventDate)) {
        return false;
      }
      
      // 3. Exclude non-class entries
      if (entry.type !== "CLASS") return false;
      
      return true;
    })
    .filter((entry) => parseKietDateTime(entry.end).getTime() >= now)
    .filter((entry) => {
      const key = `${entry.courseCode ?? "na"}-${entry.start}-${entry.end}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort(
      (left, right) =>
        parseKietDateTime(left.start).getTime() - parseKietDateTime(right.start).getTime(),
    );
}

export function formatScheduleDay(value: string): string {
  return DATE_FORMATTER.format(parseKietDateTime(value));
}

export function formatScheduleTime(value: string): string {
  return TIME_FORMATTER.format(parseKietDateTime(value));
}

export function formatCapturedAt(timestamp: number | null): string {
  if (!timestamp) {
    return "Not captured yet";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}
