import type {
  DatewiseAttendanceBucket,
  ScheduleEntry,
  StudentDetails,
} from "../types/kiet";
import { callExtension } from "../utils/bridge";

const AES_KEY_BASE64 = "NPdLWA5w7yFQhPeUuKmO/A==";
const AES_IV_BASE64 = "bV5V6nK4phvQG9ZhkAjugQ==";

const STORAGE_KEYS = {
  TOKEN: "cybervidya_authToken",
  STUDENT_ID: "cybervidya_studentId",
  SESSION_ID: "cybervidya_sessionId",
  CAPTURED_AT: "cybervidya_capturedAt",
};

const API_BASE = "/api/cybervidya";

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function encryptAES128CBC(text: string): Promise<string> {
  const keyBytes = base64ToUint8Array(AES_KEY_BASE64);
  const ivBytes = base64ToUint8Array(AES_IV_BASE64);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  const encoder = new TextEncoder();
  const plainTextBytes = encoder.encode(text);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv: ivBytes },
    cryptoKey,
    plainTextBytes
  );

  return uint8ArrayToBase64(new Uint8Array(encryptedBuffer));
}

export function sanitizeToken(token: string): string {
  if (!token) return "";
  const cleaned = token.trim().replace(/^"|"$/g, "");
  if (/^GlobalEducation\s+/i.test(cleaned)) {
    return cleaned;
  }
  return `GlobalEducation ${cleaned}`;
}

export function getStoredSession() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const capturedAt = localStorage.getItem(STORAGE_KEYS.CAPTURED_AT);
  const studentId = localStorage.getItem(STORAGE_KEYS.STUDENT_ID);
  const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);

  return {
    hasToken: Boolean(token),
    token: token ? sanitizeToken(token) : null,
    capturedAt: capturedAt ? parseInt(capturedAt, 10) : null,
    studentId: studentId ? (isNaN(Number(studentId)) ? studentId : Number(studentId)) : null,
    sessionId: sessionId ? (isNaN(Number(sessionId)) ? sessionId : Number(sessionId)) : null,
  };
}

export function saveStoredToken(rawToken: string, studentId?: string | number | null, sessionId?: string | number | null) {
  const token = sanitizeToken(rawToken);
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.CAPTURED_AT, String(Date.now()));
  if (studentId !== undefined && studentId !== null) {
    localStorage.setItem(STORAGE_KEYS.STUDENT_ID, String(studentId));
  }
  if (sessionId !== undefined && sessionId !== null) {
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, String(sessionId));
  }
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.CAPTURED_AT);
  localStorage.removeItem(STORAGE_KEYS.STUDENT_ID);
  localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
}

async function requestApi<T>(
  pathname: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string>; _isInternalLookup?: boolean } = {}
): Promise<T> {
  let session = getStoredSession();

  // Automatic UID resolution if session token exists but studentId is not yet in storage
  if (
    session.token &&
    !session.studentId &&
    !options._isInternalLookup &&
    pathname !== "/student/dashboard/registered-courses" &&
    pathname !== "/auth/encrypt/login" &&
    pathname !== "/auth/verify/otp"
  ) {
    try {
      const infoRes = await requestApi<{ data: Array<{ studentId?: number | string; sessionId?: number | string }> }>(
        "/student/dashboard/registered-courses",
        { _isInternalLookup: true }
      );
      const first = Array.isArray(infoRes?.data) ? infoRes.data[0] : null;
      if (first?.studentId) {
        saveStoredToken(session.token, first.studentId, first.sessionId);
        session = getStoredSession();
      }
    } catch (e) {
      console.warn("Failed automatic studentId resolution:", e);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (session.token) {
    headers["Authorization"] = session.token;
  }
  if (session.studentId && !headers["UID"]) {
    headers["UID"] = String(session.studentId);
  }

  const response = await fetch(`${API_BASE}${pathname}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    clearStoredSession();
    throw new Error("Your KIET session expired. Please log in again.");
  }

  if (response.status === 500) {
    throw new Error(
      "CyberVidya server error (500). CyberVidya's servers are temporarily experiencing issues. Please try again in a few moments."
    );
  }

  if (!response.ok) {
    let errorMsg = `CyberVidya error (${response.status})`;
    try {
      const jsonErr = await response.json();
      if (jsonErr?.error?.reason) {
        errorMsg = jsonErr.error.reason;
      } else if (jsonErr?.message) {
        errorMsg = jsonErr.message;
      } else if (jsonErr?.error) {
        errorMsg = typeof jsonErr.error === "string" ? jsonErr.error : JSON.stringify(jsonErr.error);
      }
    } catch {
      try {
        const text = await response.text();
        errorMsg = text.slice(0, 160) || errorMsg;
      } catch {
        // use default errorMsg
      }
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export interface LoginResult {
  ok: boolean;
  requiresOtp?: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

export async function loginDirect(username: string, pass: string): Promise<LoginResult> {
  try {
    const encryptedUserName = await encryptAES128CBC(username.trim());
    const encryptedPassword = await encryptAES128CBC(pass.trim());

    const res = await requestApi<any>("/auth/encrypt/login", {
      method: "POST",
      body: {
        userName: encryptedUserName,
        password: encryptedPassword,
        device: "WEB",
        version: null,
        reCaptchaToken: null,
      },
    });

    const dataObj = res?.data || res;
    const transactionId =
      dataObj?.transactionId ||
      dataObj?.transaction_id ||
      dataObj?.txId ||
      res?.transactionId;

    if (transactionId) {
      return {
        ok: false,
        requiresOtp: true,
        transactionId: String(transactionId),
        message: dataObj?.message || res?.message || "OTP sent to your registered mobile/email",
      };
    }

    const token =
      dataObj?.token ||
      dataObj?.id_token ||
      res?.token ||
      res?.id_token ||
      (typeof dataObj === "string" && dataObj.length > 20 ? dataObj : null);

    if (token) {
      saveStoredToken(token);
      return { ok: true };
    }

    return { ok: false, error: "Login failed: No authentication token returned." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function verifyOtpDirect(transactionId: string, otp: string): Promise<LoginResult> {
  try {
    const res = await requestApi<any>("/auth/verify/otp", {
      method: "POST",
      body: {
        otp: otp.trim(),
        transactionId,
        device: "WEB",
        version: null,
      },
    });

    const dataObj = res?.data || res;
    const token =
      dataObj?.token ||
      dataObj?.id_token ||
      res?.token ||
      res?.id_token ||
      (typeof dataObj === "string" && dataObj.length > 20 ? dataObj : null);

    if (token) {
      saveStoredToken(token);
      return { ok: true };
    }

    return { ok: false, error: "OTP verification failed: Token not received." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchAttendanceDirect(): Promise<StudentDetails> {
  const res = await requestApi<{ data: StudentDetails }>("/attendance/course/component/student");
  return res.data;
}

export async function fetchStudentIdDirect(): Promise<{ studentId: number | string | null; sessionId: number | string | null }> {
  const res = await requestApi<{ data: Array<{ studentId?: number | string; sessionId?: number | string }> }>(
    "/student/dashboard/registered-courses"
  );
  const first = Array.isArray(res.data) ? res.data[0] : null;
  const studentId = first?.studentId ?? null;
  const sessionId = first?.sessionId ?? null;

  if (studentId || sessionId) {
    saveStoredToken(localStorage.getItem(STORAGE_KEYS.TOKEN) || "", studentId, sessionId);
  }

  return { studentId, sessionId };
}

export async function fetchScheduleDirect(weekStartDate: string, weekEndDate: string): Promise<ScheduleEntry[]> {
  const params = new URLSearchParams({ weekStartDate, weekEndDate });
  const res = await requestApi<{ data: ScheduleEntry[] }>(`/student/schedule/class?${params.toString()}`);
  return res.data;
}

export async function fetchDatewiseAttendanceDirect(
  studentId: number | string,
  sessionId: number | string | null,
  courseId: number,
  courseCompId: number
): Promise<DatewiseAttendanceBucket[]> {
  const res = await requestApi<{ data: DatewiseAttendanceBucket[] }>(
    "/attendance/schedule/student/course/attendance/percentage",
    {
      method: "POST",
      headers: { UID: String(studentId) },
      body: {
        studentId,
        sessionId,
        courseId,
        courseCompId,
      },
    }
  );
  return res.data;
}

/* Unified Handlers (Check Direct API first, Fallback to Extension if needed) */

export async function getSessionStatusUnified(): Promise<{ hasToken: boolean; capturedAt: number | null }> {
  const directSession = getStoredSession();
  if (directSession.hasToken) {
    return {
      hasToken: true,
      capturedAt: directSession.capturedAt,
    };
  }

  try {
    const extSession = await callExtension("GET_SESSION_STATUS", {});
    return {
      hasToken: extSession.hasToken,
      capturedAt: extSession.capturedAt,
    };
  } catch {
    return { hasToken: false, capturedAt: null };
  }
}

export async function fetchAttendanceUnified(): Promise<StudentDetails> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchAttendanceDirect();
  }
  return callExtension("FETCH_ATTENDANCE", {});
}

export async function fetchStudentIdUnified(): Promise<{ studentId: number | string | null; sessionId: number | string | null }> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchStudentIdDirect();
  }
  return callExtension("FETCH_STUDENT_ID", {});
}

export async function fetchScheduleUnified(range: { weekStartDate: string; weekEndDate: string }): Promise<ScheduleEntry[]> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchScheduleDirect(range.weekStartDate, range.weekEndDate);
  }
  return callExtension("FETCH_SCHEDULE", range);
}

export async function fetchDatewiseAttendanceUnified(params: {
  studentId: number | string;
  sessionId: number | string | null;
  courseId: number;
  courseCompId: number;
}): Promise<DatewiseAttendanceBucket[]> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchDatewiseAttendanceDirect(params.studentId, params.sessionId, params.courseId, params.courseCompId);
  }
  return callExtension("FETCH_DATEWISE_ATTENDANCE", params);
}

export async function clearSessionUnified() {
  clearStoredSession();
  try {
    await callExtension("CLEAR_SESSION", {});
  } catch {
    // Ignore error if extension is not present
  }
}
