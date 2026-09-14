import type { ScheduleEntry, StudentDetails } from "../types/kiet";
import { calculateAttendancePercentage } from "./attendanceCalculations";

export interface SnapshotCourseComponent {
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

export interface SnapshotScheduleEntry {
  courseCode: string | null;
  courseName: string | null;
  courseCompName: string | null;
  start: string;
  end: string;
  type: "CLASS" | "HOLIDAY";
  classRoom: string | null;
}

export interface UnifiedSnapshotPayload {
  studentName: string;
  capturedAt: string;
  attendance: SnapshotCourseComponent[];
  schedule: SnapshotScheduleEntry[];
}

export function createUnifiedSnapshotPayload(
  attendance: StudentDetails,
  schedule: ScheduleEntry[],
  capturedAtMs?: number | null
): UnifiedSnapshotPayload {
  const courses: SnapshotCourseComponent[] = [];

  if (attendance.attendanceCourseComponentInfoList) {
    for (const course of attendance.attendanceCourseComponentInfoList) {
      if (course.attendanceCourseComponentNameInfoList) {
        for (const comp of course.attendanceCourseComponentNameInfoList) {
          const present = comp.numberOfPresent + comp.numberOfExtraAttendance;
          const total = comp.numberOfPeriods;
          const percentage = calculateAttendancePercentage(
            present,
            total,
            comp.presentPercentage
          );

          courses.push({
            courseCode: course.courseCode,
            courseName: course.courseName,
            courseId: course.courseId,
            componentName: comp.componentName,
            courseComponentId: comp.courseComponentId,
            present,
            extraAttendance: comp.numberOfExtraAttendance,
            total,
            percentage,
          });
        }
      }
    }
  }

  const scheduleEntries: SnapshotScheduleEntry[] = (schedule || []).map((entry) => ({
    courseCode: entry.courseCode || null,
    courseName: entry.courseName || null,
    courseCompName: entry.courseCompName || null,
    start: entry.start,
    end: entry.end,
    type: entry.type === "HOLIDAY" ? "HOLIDAY" : "CLASS",
    classRoom: entry.classRoom || null,
  }));

  const timestamp = capturedAtMs ? new Date(capturedAtMs) : new Date();

  return {
    studentName: attendance.fullName || "Student",
    capturedAt: timestamp.toISOString(),
    attendance: courses,
    schedule: scheduleEntries,
  };
}
