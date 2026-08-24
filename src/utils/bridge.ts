import type {
  AppBridgeRequest,
  BridgeRequestPayloadMap,
  BridgeRequestType,
  BridgeResponsePayloadMap,
  ExtensionBridgeResponse,
  SessionStatus,
} from "../types/bridge";

const TOKEN_STORAGE_KEY = "kiet-auth-token";
const UID_STORAGE_KEY = "kiet-auth-uid";
const CAPTURED_AT_STORAGE_KEY = "kiet-auth-captured-at";
const EXTENSION_INFO_TIMEOUT_MS = 3_000;

function getExtensionInfo(): Promise<BridgeResponsePayloadMap["GET_EXTENSION_INFO"]> {
  const type = "GET_EXTENSION_INFO";
  const requestId = `extension-info-${crypto.randomUUID()}`;
  const request: AppBridgeRequest<typeof type> = {
    source: "kiet-dashboard-app",
    type,
    requestId,
    payload: {},
  };

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("The required KIET Auth Bridge extension (v0.1.4) is not installed or is out of date."));
    }, EXTENSION_INFO_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", handleMessage);
    }

    function handleMessage(event: MessageEvent) {
      const response = event.data as ExtensionBridgeResponse<typeof type> | undefined;
      if (
        event.source !== window ||
        !response ||
        response.source !== "kiet-auth-extension" ||
        response.type !== type ||
        response.requestId !== requestId
      ) {
        return;
      }

      cleanup();
      if (!response.ok) {
        reject(new Error("The installed KIET Auth Bridge extension is out of date. Install v0.1.4."));
        return;
      }

      resolve(response.payload as BridgeResponsePayloadMap["GET_EXTENSION_INFO"]);
    }

    window.addEventListener("message", handleMessage);
    window.postMessage(request, window.location.origin);
  });
}

export function saveKietSession(token: string) {
  const cleanToken = token.trim().replace(/^\"|\"$/g, "");
  if (!cleanToken) {
    throw new Error("Enter a valid KIET session token.");
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, cleanToken);
  localStorage.setItem(CAPTURED_AT_STORAGE_KEY, String(Date.now()));
}

function getSessionStatus(): SessionStatus {
  const capturedAt = Number(localStorage.getItem(CAPTURED_AT_STORAGE_KEY));
  return {
    hasToken: Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)),
    capturedAt: Number.isFinite(capturedAt) && capturedAt > 0 ? capturedAt : null,
    targetOrigin: window.location.origin,
  };
}

export async function callExtension<T extends BridgeRequestType>(
  type: T,
  payload: BridgeRequestPayloadMap[T],
): Promise<BridgeResponsePayloadMap[T]> {
  if (type === "GET_EXTENSION_INFO") {
    return getExtensionInfo() as Promise<BridgeResponsePayloadMap[T]>;
  }
  if (type === "PING") {
    return { ok: true } as BridgeResponsePayloadMap[T];
  }
  if (type === "GET_SESSION_STATUS") {
    return getSessionStatus() as BridgeResponsePayloadMap[T];
  }
  if (type === "CLEAR_SESSION") {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(UID_STORAGE_KEY);
    localStorage.removeItem(CAPTURED_AT_STORAGE_KEY);
    return { ok: true } as BridgeResponsePayloadMap[T];
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    throw new Error("Connect KIET first by adding your session token.");
  }

  const response = await fetch("/api/kiet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      payload,
      token,
      uid: localStorage.getItem(UID_STORAGE_KEY),
    }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    payload?: BridgeResponsePayloadMap[T];
    error?: string;
  };

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "KIET could not complete the request.");
  }

  if (type === "FETCH_STUDENT_ID" && result.payload) {
    const student = result.payload as BridgeResponsePayloadMap["FETCH_STUDENT_ID"];
    if (student.studentId !== null) {
      localStorage.setItem(UID_STORAGE_KEY, String(student.studentId));
    }
  }

  return result.payload as BridgeResponsePayloadMap[T];
}
