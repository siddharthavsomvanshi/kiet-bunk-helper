const API_BASE_URL = "https://kiet.cybervidya.net/api";

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function setStorage(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, resolve);
  });
}

function removeStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, resolve);
  });
}

async function getStoredSession() {
  const result = await getStorage(["authToken", "uid", "studentId"]);
  return {
    token: result.authToken ?? null,
    uid: result.uid ?? result.studentId ?? null,
  };
}

async function setupHeaderRules() {
  if (!chrome.declarativeNetRequest) return;
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map((r) => r.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds,
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "Origin", operation: "set", value: "https://kiet.cybervidya.net" },
              { header: "Referer", operation: "set", value: "https://kiet.cybervidya.net/main/dashboard" },
              { header: "Sec-Fetch-Site", operation: "set", value: "same-origin" },
            ],
          },
          condition: {
            urlFilter: "https://kiet.cybervidya.net/*",
          },
        },
      ],
    });
  } catch (err) {
    console.error("Failed to setup declarativeNetRequest rules:", err);
  }
}

setupHeaderRules();

if (chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    setupHeaderRules();
  });
}

async function fetchKietJson(pathname, options = {}) {
  const session = await getStoredSession();

  if (!session.token) {
    throw new Error("No KIET session is saved yet. Connect through the extension first.");
  }

  await setupHeaderRules();

  const uidValue = options.uidOverride ?? session.uid;

  const headers = {
    Authorization: `GlobalEducation ${session.token}`,
    Accept: "application/json, text/plain, */*",
    ...(uidValue ? { UID: String(uidValue) } : {}),
    ...(options.includeJsonHeaders
      ? {
          "Content-Type": "application/json",
        }
      : {}),
  };

  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body,
  });

  if (response.status === 401) {
    await removeStorage(["authToken", "capturedAt"]);
    throw new Error("Your KIET session expired. Connect again to refresh the token.");
  }

  if (!response.ok) {
    const responseText = await response.text();
    let msg = `KIET API request failed with ${response.status}: ${responseText.slice(0, 160)}`;
    if (response.status === 403 && responseText.includes("Blocked")) {
      msg = `Domain blocked by KIET API (403). Please reload the extension at chrome://extensions to activate request rules.`;
    }
    throw new Error(msg);
  }

  return response.json();
}

async function handleMessage(message) {
  switch (message.type) {
    case "PING":
      return { ok: true, payload: { ok: true } };

    case "PREPARE_LOGIN":
      await setStorage({
        pendingLogin: true,
        targetOrigin: message.payload?.targetOrigin ?? null,
      });
      return { ok: true, payload: { ok: true } };

    case "STORE_TOKEN":
      await setStorage({
        authToken: message.payload?.token ?? null,
        capturedAt: Date.now(),
        sourceUrl: message.payload?.sourceUrl ?? null,
      });
      return { ok: true, payload: { ok: true } };

    case "GET_SESSION_STATUS": {
      const result = await getStorage(["authToken", "capturedAt", "targetOrigin"]);
      return {
        ok: true,
        payload: {
          hasToken: Boolean(result.authToken),
          capturedAt: result.capturedAt ?? null,
          targetOrigin: result.targetOrigin ?? null,
        },
      };
    }

    case "FETCH_ATTENDANCE": {
      const response = await fetchKietJson("/attendance/course/component/student");
      return {
        ok: true,
        payload: response.data,
      };
    }

    case "FETCH_STUDENT_ID": {
      const response = await fetchKietJson("/student/dashboard/registered-courses");
      const firstCourse = Array.isArray(response.data) ? response.data[0] : null;

      return {
        ok: true,
        payload: {
          studentId: firstCourse?.studentId ?? null,
          sessionId: firstCourse?.sessionId ?? null,
        },
      };
    }

    case "FETCH_SCHEDULE": {
      const weekStartDate = message.payload?.weekStartDate;
      const weekEndDate = message.payload?.weekEndDate;

      if (!weekStartDate || !weekEndDate) {
        throw new Error("A weekly schedule request needs both weekStartDate and weekEndDate.");
      }

      const searchParams = new URLSearchParams({
        weekStartDate,
        weekEndDate,
      });

      const response = await fetchKietJson(`/student/schedule/class?${searchParams.toString()}`);
      return {
        ok: true,
        payload: response.data,
      };
    }

    case "FETCH_DATEWISE_ATTENDANCE": {
      const studentId = message.payload?.studentId;
      const sessionId = message.payload?.sessionId ?? null;
      const courseId = message.payload?.courseId;
      const courseCompId = message.payload?.courseCompId;

      if (studentId === undefined || studentId === null || !courseId || !courseCompId) {
        throw new Error(
          "A date-wise attendance request needs studentId, courseId, and courseCompId.",
        );
      }

      const response = await fetchKietJson(
        "/attendance/schedule/student/course/attendance/percentage",
        {
          method: "POST",
          includeJsonHeaders: true,
          uidOverride: studentId,
          body: JSON.stringify({
            studentId,
            sessionId,
            courseId,
            courseCompId,
          }),
        },
      );

      return {
        ok: true,
        payload: response.data,
      };
    }

    case "CLEAR_SESSION":
      await removeStorage(["authToken", "uid", "studentId", "capturedAt", "pendingLogin", "sourceUrl"]);
      return { ok: true, payload: { ok: true } };

    default:
      throw new Error(`Unsupported extension request: ${String(message.type)}`);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return true;
});
