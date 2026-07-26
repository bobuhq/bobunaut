import { useState } from "react";

type BuilderSignalWidgetProps = {
  authenticated: boolean;
  inviteCode?: string;
};

export default function BuilderSignalWidget({
  authenticated,
  inviteCode,
}: BuilderSignalWidgetProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!inviteCode) return;

    await navigator.clipboard.writeText(inviteCode);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const shareSignal = () => {
    if (!inviteCode) return;

    const text =
      `I just joined BOBU Universe.\n\n` +
      `My Builder Signal: ${inviteCode}\n\n` +
      `Join the Builder Civilization Network.`;

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        right: "24px",
        bottom: "24px",
        width: "260px",
        padding: "18px",
        borderRadius: "20px",
        color: "white",
        background:
          "linear-gradient(145deg, rgba(18,20,40,0.96), rgba(8,10,24,0.96))",
        border: "1px solid rgba(153,69,255,0.35)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        zIndex: 50,
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#14f195",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        BUILDER SIGNAL
      </p>

      {!authenticated ? (
        <p
          style={{
            marginTop: "12px",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          🔒 Sign in to unlock your referral code
        </p>
      ) : (
        <>
          <strong
            style={{
              display: "block",
              marginTop: "12px",
              fontSize: "22px",
              letterSpacing: "0.08em",
            }}
          >
            {inviteCode}
          </strong>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "14px",
            }}
          >
            <button onClick={copyCode}>
              {copied ? "Copied" : "Copy"}
            </button>

            <button onClick={shareSignal}>
              Share
            </button>
          </div>
        </>
      )}
    </div>
  );
}
