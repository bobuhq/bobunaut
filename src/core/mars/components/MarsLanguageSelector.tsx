import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import {
  useLanguage,
  type SupportedLanguage,
} from "../../language";

type Props = {
  style?: CSSProperties;
};

export default function MarsLanguageSelector({
  style,
}: Props) {
  const {
    language,
    languages,
    setLanguage,
    t,
  } = useLanguage();

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <label
      aria-label={t("mars.ui.language")}
      style={{
        position: "fixed",
        top: "8px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2147483646,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 6px",
        border: "1px solid rgba(255,255,255,.14)",
        borderRadius: "999px",
        background: "rgba(5,7,18,.66)",
        backdropFilter: "blur(10px)",
        color: "rgba(255,255,255,.82)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "8px",
        fontWeight: 900,
        letterSpacing: ".08em",
        ...style,
      }}
    >
      <span aria-hidden="true">◎</span>

      <select
        value={language}
        aria-label={t("mars.ui.language")}
        onChange={(event) => {
          void setLanguage(
            event.target.value as SupportedLanguage,
          );
        }}
        style={{
          border: 0,
          outline: 0,
          padding: 0,
          background: "transparent",
          color: "inherit",
          font: "inherit",
          cursor: "pointer",
        }}
      >
        {languages.map((option) => (
          <option
            key={option.code}
            value={option.code}
          >
            {option.code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>,
    document.body,
  );
}
