import { ImageResponse } from "next/og";

export const alt = "Senang Belajar — AI Tutor untuk SD, SMP, SMA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #FFF7ED 0%, #ffffff 55%, #F0FDFA 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#f97316",
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 700,
              padding: "10px 26px",
              borderRadius: 999,
            }}
          >
            AI Tutor untuk SD, SMP, SMA
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            color: "#292524",
            lineHeight: 1.15,
            letterSpacing: -2,
          }}
        >
          Belajar jadi senang
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            color: "#f97316",
            lineHeight: 1.15,
            letterSpacing: -2,
          }}
        >
          dengan AI Tutor pribadi
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 32,
            color: "#78716c",
            maxWidth: 900,
          }}
        >
          Kuis interaktif, jadwal belajar, dan laporan mingguan untuk orang tua.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 30,
            fontWeight: 600,
            color: "#292524",
          }}
        >
          senangbelajar.web.id
        </div>
      </div>
    ),
    { ...size },
  );
}
