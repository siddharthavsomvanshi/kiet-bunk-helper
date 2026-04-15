console.log("KIET Auth Bridge content script active on", window.location.href);

const APP_HOST_MATCHERS = ["localhost", "127.0.0.1", "cybervidya.pages.dev", "kiet-bunk-helper.vercel.app"];
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

function maybeCaptureTokenAndReturn() {
  const token = localStorage.getItem("authenticationtoken");

  if (!token) {
    return;
  }

  chrome.storage.local.get(["pendingLogin", "targetOrigin"], (result) => {
    if (!result.pendingLogin || !result.targetOrigin) {
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: "STORE_TOKEN",
        payload: {
          token: sanitizeToken(token),
          sourceUrl: window.location.href,
        },
      },
      () => {
        chrome.storage.local.set({ pendingLogin: false }, () => {
          window.location.href = `${result.targetOrigin}/?session=ready`;
        });
      },
    );
  });
}

function initialize() {
  if (isDashboardDomain()) {
    attachAppBridge();
  }

  if (isKietDomain()) {
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

    maybeCaptureTokenAndReturn();
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
