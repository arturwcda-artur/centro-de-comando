import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f5fae" }}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M8 22V12l8-4 8 4v10" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M13 22v-6h6v6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
