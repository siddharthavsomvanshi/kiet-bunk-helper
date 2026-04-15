import type {
  AppBridgeRequest,
  BridgeRequestPayloadMap,
  BridgeRequestType,
  BridgeResponsePayloadMap,
  ExtensionBridgeResponse,
} from "../types/bridge";

const BRIDGE_TIMEOUT_MS = 12_000;

export async function callExtension<T extends BridgeRequestType>(
  type: T,
  payload: BridgeRequestPayloadMap[T],
): Promise<BridgeResponsePayloadMap[T]> {
  const requestId = `${type.toLowerCase()}-${crypto.randomUUID()}`;

  const request: AppBridgeRequest<T> = {
    source: "kiet-dashboard-app",
    type,
    requestId,
    payload,
  };

  return new Promise<BridgeResponsePayloadMap[T]>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "The extension did not respond. Make sure the unpacked extension is installed and allowed on this site.",
        ),
      );
    }, BRIDGE_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", handleMessage);
    }

    function handleMessage(event: MessageEvent) {
      const data = event.data as ExtensionBridgeResponse<T> | undefined;

      if (event.source !== window || !data || data.source !== "kiet-auth-extension") {
        return;
      }

      if (data.requestId !== requestId || data.type !== type) {
        return;
      }

      cleanup();

      if (!data.ok) {
        reject(new Error(data.error ?? "The extension reported an unknown error."));
        return;
      }

      resolve(data.payload as BridgeResponsePayloadMap[T]);
    }

    window.addEventListener("message", handleMessage);
    window.postMessage(request, window.location.origin);
  });
}
