import { useRef, useState } from "react";
import { toPng } from "html-to-image";

type BuilderPassportShareCardProps = {
  displayName: string;
  username: string;
  gpRank: string;
  gpBalance: number;
  walletAddress: string;
};

export default function BuilderPassportShareCard({
  displayName,
  username,
  gpRank,
  gpBalance,
  walletAddress,
}: BuilderPassportShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;

    try {
      setIsDownloading(true);

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#080618",
      });

      const link = document.createElement("a");
      link.download = `${username}-builder-passport.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Builder Passport download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={cardRef}
        style={{
          width: "100%",
          maxWidth: 1200,
          aspectRatio: "1200 / 630",
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          background: "#080618",
        }}
      >
        <img
          src="/images/passport/bobu-passport-share-v1.png"
          alt={`${displayName} Builder Passport`}
          crossOrigin="anonymous"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "3%",
            bottom: "7%",
            width: "56%",
            padding: "2.5%",
            borderRadius: 18,
            background: "rgba(5, 3, 20, 0.84)",
            border: "1px solid rgba(187, 113, 255, 0.45)",
            backdropFilter: "blur(12px)",
            boxSizing: "border-box",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#d8a8ff",
              fontSize: "clamp(10px, 1vw, 14px)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            @{username}
          </p>

          <h2
            style={{
              margin: "6px 0 12px",
              fontSize: "clamp(20px, 3vw, 40px)",
              lineHeight: 1,
            }}
          >
            {displayName}
          </h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 8,
              fontSize: "clamp(10px, 1.2vw, 16px)",
            }}
          >
            <strong>GP RANK · {gpRank}</strong>
            <span>
              {gpBalance.toLocaleString("tr-TR")} GP
            </span>
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(255, 255, 255, 0.14)",
            }}
          />

          <p
            style={{
              margin: "12px 0 0",
              color: "rgba(255, 255, 255, 0.68)",
              fontSize: "clamp(9px, 1vw, 13px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Wallet: {walletAddress}
          </p>
        </div>
      </div>

      <button
        id="builder-passport-download-trigger"
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "14px 18px",
          border: "1px solid rgba(20, 241, 149, 0.45)",
          borderRadius: 14,
          color: "white",
          fontWeight: 800,
          cursor: isDownloading ? "wait" : "pointer",
          opacity: isDownloading ? 0.7 : 1,
          background:
            "linear-gradient(135deg, rgba(20, 241, 149, 0.22), rgba(153, 69, 255, 0.28))",
        }}
      >
        {isDownloading ? "Preparing PNG..." : "Download PNG"}
      </button>
    </div>
  );
}
