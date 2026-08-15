import { Link } from "react-router-dom";
import { useLanguage } from "../../core/language";

export function LegalBackLink() {
  const { t } = useLanguage();

  return (
    <Link
      className="bobu-legal-back"
      to="/"
      aria-label={t("legal.back")}
    >
      <span aria-hidden="true">←</span>
      {t("legal.back")}
    </Link>
  );
}
