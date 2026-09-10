console.log("KIET Auth Bridge content script active on", window.location.href);

const APP_HOST_MATCHERS = ["localhost", "127.0.0.1", "cybervidya.pages.dev", "vercel.app"];
const BRIDGE_APP_SOURCE = "kiet-dashboard-app";
const BRIDGE_EXTENSION_SOURCE = "kiet-auth-extension";

function isKietDomain() {
  return window.location.hostname === "kiet.cybervidya.net";
}

function isDashboardDomain() {
  return APP_HOST_MATCHERS.some((host) => window.location.hostname.includes(host));
}

function createMarker() {
  if (document.getElementById("kiet-extension-installed")) {
    return;
  }

  const marker = document.createElement("div");
  marker.id = "kiet-extension-installed";
  marker.style.display = "none";
  document.body.appendChild(marker);
}

function sanitizeToken(rawToken) {
  return rawToken.replace(/^"|"$/g, "");
}

function postBridgeResponse(type, requestId, ok, payload, error) {
  window.postMessage(
    {
      source: BRIDGE_EXTENSION_SOURCE,
      type,
      requestId,
      ok,
      payload,
      error,
    },
    window.location.origin,
  );
}

function attachAppBridge() {
  createMarker();

  chrome.storage.local.set({ targetOrigin: window.location.origin });

  window.addEventListener("message", (event) => {
    const message = event.data;

    if (
      event.source !== window ||
      !message ||
      message.source !== BRIDGE_APP_SOURCE ||
      typeof message.type !== "string" ||
      typeof message.requestId !== "string"
    ) {
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: message.type,
        payload: message.payload ?? {},
      },
      (response) => {
        if (chrome.runtime.lastError) {
          postBridgeResponse(
            message.type,
            message.requestId,
            false,
            undefined,
            chrome.runtime.lastError.message,
          );
          return;
        }

        postBridgeResponse(
          message.type,
          message.requestId,
          response?.ok === true,
          response?.payload,
          response?.error,
        );
      },
    );
  });
}

function extractUid() {
  const keys = ["uid", "userId", "UID", "user_id", "user", "userData", "id", "studentId"];
  
  for (const key of keys) {
    const val = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (val) {
      try {
        const parsed = JSON.parse(val);
        if (parsed && typeof parsed === "object") {
          if (parsed.id) return String(parsed.id);
          if (parsed.userId) return String(parsed.userId);
          if (parsed.uid) return String(parsed.uid);
          if (parsed.studentId) return String(parsed.studentId);
        }
      } catch (e) {}
      const clean = val.replace(/^"|"$/g, "");
      if (/^\d+$/.test(clean)) {
        return clean;
      }
    }
  }

  const match = document.cookie.match(/(?:^|;\s*)(?:uid|userId|UID|id)=(\d+)/i);
  if (match) {
    return match[1];
  }

  return null;
}

let isCapturing = false;

function patchStorageSetItem() {
  try {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);
      if (key === "authenticationtoken" && isKietDomain()) {
        maybeCaptureTokenAndReturn();
      }
    };
  } catch (e) {
    console.error("Failed to patch Storage.prototype.setItem", e);
  }
}

function maybeCaptureTokenAndReturn() {
  if (isCapturing) return;

  const token = localStorage.getItem("authenticationtoken");
  const uid = extractUid();

  if (!token) {
    return;
  }

  isCapturing = true;

  chrome.runtime.sendMessage(
    {
      type: "STORE_TOKEN",
      payload: {
        token: sanitizeToken(token),
        uid: uid ? sanitizeToken(uid) : null,
        sourceUrl: window.location.href,
      },
    },
    () => {
      isCapturing = false;
      chrome.storage.local.get(["pendingLogin", "targetOrigin"], (result) => {
        if (result.pendingLogin && result.targetOrigin) {
          chrome.storage.local.set({ pendingLogin: false, clearedForLogin: false }, () => {
            const target = `${result.targetOrigin}/?session=ready`;
            if (window.top && window.top !== window) {
              window.top.location.href = target;
            } else {
              window.location.href = target;
            }
          });
        }
      });
    },
  );
}

function injectKietOverlay() {
  if (window.top !== window) {
    return;
  }

  if (sessionStorage.getItem("kiet_overlay_closed") === "true") {
    return;
  }

  if (document.getElementById("kiet-bunk-helper-overlay-root")) {
    return;
  }

  chrome.storage.local.get(["targetOrigin"], (result) => {
    let baseUrl = result.targetOrigin || "https://kiet-bunk-helper.vercel.app";
    baseUrl = baseUrl.replace(/\/$/, "");
    const iframeUrl = `${baseUrl}/?mode=overlay`;

    const container = document.createElement("div");
    container.id = "kiet-bunk-helper-overlay-root";
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      max-width: calc(100vw - 32px);
      height: 560px;
      max-height: calc(100vh - 40px);
      z-index: 2147483647;
      background: #0f172a;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.15);
      transition: opacity 0.2s ease, transform 0.2s ease;
      box-sizing: border-box;
    `;

    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #1e293b;
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 700;
      user-select: none;
      cursor: move;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    `;

    const titleDiv = document.createElement("div");
    titleDiv.style.cssText = "display: flex; align-items: center; gap: 6px;";
    titleDiv.innerHTML = `<span style="color:#60a5fa;">⚡</span> <span>Bunk Helper</span>`;

    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "display: flex; align-items: center; gap: 8px;";

    const minBtn = document.createElement("button");
    minBtn.type = "button";
    minBtn.title = "Minimize";
    minBtn.innerHTML = "─";
    minBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
    `;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.title = "Close for session";
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
    `;

    controlsDiv.appendChild(minBtn);
    controlsDiv.appendChild(closeBtn);
    header.appendChild(titleDiv);
    header.appendChild(controlsDiv);

    const iframe = document.createElement("iframe");
    iframe.src = iframeUrl;
    iframe.style.cssText = "width: 100%; height: 100%; border: none; background: transparent; flex: 1;";

    container.appendChild(header);
    container.appendChild(iframe);

    const restoreBtn = document.createElement("button");
    restoreBtn.id = "kiet-overlay-restore-btn";
    restoreBtn.type = "button";
    restoreBtn.innerHTML = `<span style="color:#60a5fa;">⚡</span> <span>Bunk Helper</span>`;
    restoreBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      display: none;
      padding: 10px 16px;
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
      align-items: center;
      gap: 6px;
    `;

    minBtn.onclick = () => {
      container.style.display = "none";
      restoreBtn.style.display = "flex";
    };

    restoreBtn.onclick = () => {
      restoreBtn.style.display = "none";
      container.style.display = "flex";
    };

    closeBtn.onclick = () => {
      sessionStorage.setItem("kiet_overlay_closed", "true");
      container.remove();
      restoreBtn.remove();
    };

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    header.onmousedown = (e) => {
      if (e.target === minBtn || e.target === closeBtn) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = container.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      container.style.bottom = "auto";
      container.style.right = "auto";
      container.style.left = `${initialLeft}px`;
      container.style.top = `${initialTop}px`;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      container.style.left = `${initialLeft + dx}px`;
      container.style.top = `${initialTop + dy}px`;
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.body.appendChild(container);
    document.body.appendChild(restoreBtn);
  });
}

function initialize() {
  if (isDashboardDomain()) {
    attachAppBridge();
  }

  if (isKietDomain()) {
    patchStorageSetItem();

    if (window.location.search.includes("action=logout")) {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      chrome.storage.local.get(["targetOrigin"], (result) => {
        if (result.targetOrigin) {
          window.location.href = result.targetOrigin;
        } else {
          window.location.href = "https://kiet.cybervidya.net/";
        }
      });
      return;
    }

    chrome.storage.local.get(["pendingLogin", "clearedForLogin"], (res) => {
      if (res.pendingLogin && !res.clearedForLogin) {
        localStorage.removeItem("authenticationtoken");
        chrome.storage.local.set({ clearedForLogin: true }, () => {
          maybeCaptureTokenAndReturn();
        });
      } else {
        maybeCaptureTokenAndReturn();
      }
    });

    setInterval(maybeCaptureTokenAndReturn, 1000);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectKietOverlay);
    } else {
      injectKietOverlay();
    }
  }
}

initialize();

let lastUrl = window.location.href;

new MutationObserver(() => {
  if (window.location.href === lastUrl) {
    return;
  }

  lastUrl = window.location.href;

  if (isKietDomain()) {
    maybeCaptureTokenAndReturn();
  }
}).observe(document, { subtree: true, childList: true });
