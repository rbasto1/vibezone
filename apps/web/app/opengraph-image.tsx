/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vibezone — Compare AI Models";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpengraphImage() {
  const title = "Vibezone";
  const subtitle = "Compare AI Models";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 80,
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 35%, #0ea5e9 100%)",
          color: "white",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 40,
            opacity: 0.92,
            fontWeight: 600,
          }}
        >
          {subtitle}
        </div>
        <div style={{ marginTop: 28, fontSize: 26, opacity: 0.9 }}>
          Test, compare, and evaluate models side-by-side.
        </div>
        <div style={{ marginTop: 40, fontSize: 24, opacity: 0.8 }}>
          vibezone.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
