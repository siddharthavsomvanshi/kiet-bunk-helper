import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for frontend requests
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, UID"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { path, ...queryParams } = req.query;
  const pathSegments = Array.isArray(path) ? path : [path || ""];
  const targetPath = pathSegments.join("/");

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, v));
    } else if (value !== undefined) {
      searchParams.append(key, value);
    }
  }

  const queryString = searchParams.toString();
  const targetUrl = `https://kiet.cybervidya.net/api/${targetPath}${queryString ? `?${queryString}` : ""}`;

  const forwardHeaders: Record<string, string> = {
    "Accept": "application/json, text/plain, */*",
    "Host": "kiet.cybervidya.net",
    "Origin": "https://kiet.cybervidya.net",
    "Referer": "https://kiet.cybervidya.net/main/dashboard",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  };

  if (req.headers.authorization) {
    forwardHeaders["Authorization"] = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
  }

  if (req.headers.uid) {
    forwardHeaders["UID"] = Array.isArray(req.headers.uid)
      ? req.headers.uid[0]
      : req.headers.uid;
  }

  if (req.headers["content-type"]) {
    forwardHeaders["Content-Type"] = Array.isArray(req.headers["content-type"])
      ? req.headers["content-type"][0]
      : req.headers["content-type"];
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get("content-type") || "";

    res.status(response.status);

    if (contentType.includes("application/json")) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    console.error("Vercel Proxy error:", error);
    res.status(500).json({
      error: "Failed to proxy request to CyberVidya API",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
