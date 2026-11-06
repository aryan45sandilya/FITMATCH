import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#171717" }}>
        <svg viewBox="0 0 24 24" width="180" height="180">
          <path d="M6 7H18" stroke="#f7f6f2" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6 7V17M10 7V11M14 7V13M18 7V11" stroke="#f7f6f2" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="17.5" cy="16.5" r="1.6" fill="#b58a5a" />
        </svg>
      </div>
    ),
    size,
  );
}
