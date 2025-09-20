let fingerprintPromise: Promise<string> | null = null;
export function generateFingerprint(sessionToken: string | undefined) {
  if (sessionToken) {
    return Promise.resolve(`Bearer ${sessionToken}`);
  }

  return (fingerprintPromise ??= new Promise((resolve) => {
    let devicesLength = 0;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        devicesLength = devices.length;
      })
      .finally(() => {
        const data = [
          window.screen.width + "x" + window.screen.height,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          navigator.pdfViewerEnabled ? 1 : 0,
          "ontouchstart" in window ? 1 : 0,
          navigator.maxTouchPoints,
          navigator.doNotTrack ?? -1,
          "deviceMemory" in navigator ? navigator.deviceMemory : -1,
          navigator.hardwareConcurrency,
          screen.orientation.type,
          devicesLength,
          getWebGLFingerprint(),
          getCanvasFingerprint(),
        ];
        createHash(data).then((fingerprint) => resolve(`Anon ${fingerprint}`));
      });
  }));
}

function getWebGLFingerprint() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) return null;

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) return null;
  return {
    v: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
    r: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
  };
}

function getCanvasFingerprint() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return -1;
  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillStyle = "#f60";
  ctx.fillRect(0, 0, 100, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("Hello, world!", 2, 2);
  return canvas.toDataURL(); // fingerprint value
}

async function createHash(data: unknown) {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(JSON.stringify(data))
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}
