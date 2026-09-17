import type { DatewiseAttendanceBucket, ScheduleEntry, StudentDetails } from "./kiet";

export interface ExamSession {
  sessionId: number;
  sessionName: string;
}

export interface HallTicketOption {
  id: number;
  title: string;
}

export type BridgeRequestType =
  | "PING"
  | "PREPARE_LOGIN"
  | "GET_SESSION_STATUS"
  | "FETCH_ATTENDANCE"
  | "FETCH_STUDENT_ID"
  | "FETCH_SCHEDULE"
  | "FETCH_DATEWISE_ATTENDANCE"
  | "FETCH_EXAM_SESSIONS"
  | "FETCH_HALL_TICKET_OPTIONS"
  | "DOWNLOAD_HALL_TICKET_PDF"
  | "CLEAR_SESSION";

export interface BridgeRequestPayloadMap {
  PING: Record<string, never>;
  PREPARE_LOGIN: { targetOrigin: string };
  GET_SESSION_STATUS: Record<string, never>;
  FETCH_ATTENDANCE: Record<string, never>;
  FETCH_STUDENT_ID: Record<string, never>;
  FETCH_SCHEDULE: { weekStartDate: string; weekEndDate: string };
  FETCH_DATEWISE_ATTENDANCE: {
    studentId: number | string;
    sessionId: number | string | null;
    courseId: number;
    courseCompId: number;
  };
  FETCH_EXAM_SESSIONS: { studentId: number | string };
  FETCH_HALL_TICKET_OPTIONS: { sessionId: number | string };
  DOWNLOAD_HALL_TICKET_PDF: { hallTicketId: number | string };
  CLEAR_SESSION: Record<string, never>;
}

export interface SessionStatus {
  hasToken: boolean;
  capturedAt: number | null;
  targetOrigin: string | null;
}

export interface BridgeResponsePayloadMap {
  PING: { ok: true };
  PREPARE_LOGIN: { ok: true };
  GET_SESSION_STATUS: SessionStatus;
  FETCH_ATTENDANCE: StudentDetails;
  FETCH_STUDENT_ID: { studentId: number | string | null; sessionId: number | string | null };
  FETCH_SCHEDULE: ScheduleEntry[];
  FETCH_DATEWISE_ATTENDANCE: DatewiseAttendanceBucket[];
  FETCH_EXAM_SESSIONS: ExamSession[];
  FETCH_HALL_TICKET_OPTIONS: HallTicketOption[];
  DOWNLOAD_HALL_TICKET_PDF: { base64Pdf: string };
  CLEAR_SESSION: { ok: true };
}

export interface AppBridgeRequest<T extends BridgeRequestType> {
  source: "kiet-dashboard-app";
  type: T;
  requestId: string;
  payload: BridgeRequestPayloadMap[T];
}

export interface ExtensionBridgeResponse<T extends BridgeRequestType> {
  source: "kiet-auth-extension";
  type: T;
  requestId: string;
  ok: boolean;
  payload?: BridgeResponsePayloadMap[T];
  error?: string;
}
