import { useState } from "react";
import { useLanguage } from "../../core/language";

type BuilderSignalWidgetProps = {
  authenticated: boolean;
  inviteCode?: string;
};

export default function BuilderSignalWidget({
  authenticated,
  inviteCode,
}: BuilderSignalWidgetProps) {
  const { t } = useLanguage();

  const [copiedValue, setCopiedValue] = useState<
    "code" | "link" | null
  >(null);

  const inviteLink = inviteCode
    ? new URL(
        `?ref=${encodeURIComponent(inviteCode)}`,
        window.location.origin + import.meta.env.BASE_URL,
      ).toString()
    : null;

  const copyValue = async (
    value: string,
    type: "code" | "link",
  ) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(type);

    window.setTimeout(() => {
      setCopiedValue(null);
    }, 2000);
  };

  const shareInvite = async () => {
    if (!inviteCode || !inviteLink) {
      return;
    }

    const shareData = {
      title: t("passport.signal.shareTitle"),
      text: t("passport.signal.shareText"),
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    const tweetText =
      `${t("passport.signal.shareText")}\n\n` +
      `${inviteLink}`;

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        tweetText,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <aside
      aria-label={t("passport.signal.ariaLabel")}
      style={{
        position: "fixed",
        right: "24px",
        bottom: "24px",
        width: "min(280px, calc(100vw - 32px))",
        padding: "18px",
        borderRadius: "20px",
        color: "white",
        background:
          "linear-gradient(145deg, rgba(18,20,40,0.97), rgba(8,10,24,0.97))",
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
          letterSpacing: "0.1em",
        }}
      >
        {t("passport.signal.title")}
      </p>

      {!authenticated ? (
        <p
          style={{
            margin: "12px 0 0",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {t("passport.signal.signIn")}
        </p>
      ) : (
        <>
          <strong
            style={{
              display: "block",
              marginTop: "12px",
              fontSize: "21px",
              letterSpacing: "0.08em",
            }}
          >
            {inviteCode}
          </strong>

          <p
            style={{
              margin: "8px 0 0",
              overflowWrap: "anywhere",
              color: "rgba(255,255,255,0.56)",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            {inviteLink}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              marginTop: "14px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (inviteCode) {
                  void copyValue(inviteCode, "code");
                }
              }}
            >
              {copiedValue === "code"
                ? t("passport.signal.copied")
                : t("passport.signal.copyCode")}
            </button>

            <button
              type="button"
              onClick={() => {
                if (inviteLink) {
                  void copyValue(inviteLink, "link");
                }
              }}
            >
              {copiedValue === "link"
                ? t("passport.signal.copied")
                : t("passport.signal.copyLink")}
            </button>

            <button
              type="button"
              onClick={() => void shareInvite()}
            >
              {t("passport.signal.share")}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
