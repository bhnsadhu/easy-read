import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = "ReadEasy: every reading, ready for every reader.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const c = brand.colors;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: c.surface, color: c.ink, fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: c.accent, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, padding: "0 16px" }}>
            <div style={{ height: 7, width: 30, borderRadius: 4, background: c.surface }} />
            <div style={{ height: 10, width: 40, borderRadius: 5, background: c.highlight }} />
            <div style={{ height: 7, width: 24, borderRadius: 4, background: c.surface }} />
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>ReadEasy</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>Every reading, ready for every reader.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, color: c.inkMuted }}>
            <span>Upload a reading.</span>
            <span>Share one link.</span>
            <span style={{ background: c.highlight, color: c.ink, padding: "4px 14px", borderRadius: 10 }}>Every student can read it.</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
