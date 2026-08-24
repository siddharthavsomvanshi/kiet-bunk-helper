const API_BASE_URL = "https://kiet.cybervidya.net/api";

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

async function fetchKietJson(token, uid, pathname, options = {}) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `GlobalEducation ${token}`,
      Accept: "application/json, text/plain, */*",
      Origin: "https://kiet.cybervidya.net",
      Referer: "https://kiet.cybervidya.net/main/dashboard",
      ...(uid ? { UID: String(uid) } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body,
  });

  if (response.status === 401) {
    throw new Error("Your KIET session expired. Add a fresh session token and try again.");
  }
  if (!response.ok) {
    throw new Error(`KIET API request failed (${response.status}).`);
  }
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Method not allowed.");

  const { type, payload = {}, token, uid } = req.body ?? {};
  if (typeof token !== "string" || !token.trim()) return fail(res, 401, "A KIET session token is required.");

  try {
    let data;
    switch (type) {
      case "FETCH_ATTENDANCE":
        data = (await fetchKietJson(token, uid, "/attendance/course/component/student")).data;
        break;
      case "FETCH_STUDENT_ID": {
        const courses = (await fetchKietJson(token, uid, "/student/dashboard/registered-courses")).data;
        const firstCourse = Array.isArray(courses) ? courses[0] : null;
        data = { studentId: firstCourse?.studentId ?? null, sessionId: firstCourse?.sessionId ?? null };
        break;
      }
      case "FETCH_SCHEDULE": {
        if (!payload.weekStartDate || !payload.weekEndDate) throw new Error("Both schedule dates are required.");
        const params = new URLSearchParams({ weekStartDate: payload.weekStartDate, weekEndDate: payload.weekEndDate });
        data = (await fetchKietJson(token, uid, `/student/schedule/class?${params}`)).data;
        break;
      }
      case "FETCH_DATEWISE_ATTENDANCE": {
        const { studentId, sessionId, courseId, courseCompId } = payload;
        if (studentId == null || !courseId || !courseCompId) throw new Error("Student and course details are required.");
        data = (await fetchKietJson(token, studentId, "/attendance/schedule/student/course/attendance/percentage", {
          method: "POST",
          body: JSON.stringify({ studentId, sessionId: sessionId ?? null, courseId, courseCompId }),
        })).data;
        break;
      }
      default:
        return fail(res, 400, "Unsupported KIET request.");
    }
    return res.status(200).json({ ok: true, payload: data });
  } catch (error) {
    return fail(res, 502, error instanceof Error ? error.message : "Unable to reach KIET.");
  }
}
