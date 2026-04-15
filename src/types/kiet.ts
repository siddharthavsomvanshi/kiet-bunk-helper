export interface StudentAttendanceApiResponse {
  data: StudentDetails;
}

export interface StudentDetails {
  fullName: string;
  registrationNumber: string;
  sectionName: string;
  branchShortName: string;
  degreeName: string;
  semesterName: string;
  studentId?: number | string | null;
  sessionId?: number | string | null;
  attendanceCourseComponentInfoList: CourseAttendanceInfo[];
}

export interface CourseAttendanceInfo {
  courseName: string;
  courseCode: string;
  courseId: number;
  attendanceCourseComponentNameInfoList: AttendanceComponentInfo[];
}

export interface AttendanceComponentInfo {
  courseComponentId: number;
  numberOfExtraAttendance: number;
  componentName: string;
  numberOfPeriods: number;
  numberOfPresent: number;
  presentPercentage: number | null;
  presentPercentageWith: string;
}

export interface ScheduleEntry {
  id: string | null;
  start: string;
  end: string;
  title: string;
  content: string | null;
  titleFullName: string | null;
  contentFullName: string | null;
  type: "CLASS" | "HOLIDAY";
  courseName: string | null;
  courseCode: string | null;
  courseCompName: string | null;
  courseCompVariant: string | null;
  facultyName: string | null;
  classRoom: string | null;
  dateTime: string | null;
  lectureDate: string | null;
}

export interface ScheduleResponse {
  data: ScheduleEntry[];
  message: string;
  timeStamp: string;
  version: string;
  reload: boolean;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "ADJUSTED" | string;

export interface DatewiseAttendanceLecture {
  planLecDate: string | null;
  dayName: string | null;
  timeSlot: string | null;
  attendance: AttendanceStatus | null;
  lectureType: string | null;
  courseName: string | null;
  attendanceAdjustmentDetails: string | null;
}

export interface DatewiseAttendanceBucket {
  lectureCount: number | null;
  presentCount: number | null;
  percent: number | null;
  courseName: string | null;
  numberOfExtraAttendance: number | null;
  lectureList: DatewiseAttendanceLecture[] | null;
}
