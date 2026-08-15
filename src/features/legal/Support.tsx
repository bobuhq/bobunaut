import { Link } from "react-router-dom";
import { useLanguage } from "../../core/language";
import { LegalBackLink } from "./LegalBackLink";
import "./LegalPage.css";

export default function Support() {
  const { t } = useLanguage();

  return (
    <main className="bobu-legal-page">
      <article className="bobu-legal-card">
        <LegalBackLink />

        <span className="bobu-legal-eyebrow">
          BOBU NETWORK
        </span>

        <h1>{t("support.title")}</h1>

        <p className="bobu-legal-updated">
          {t("support.subtitle")}
        </p>

        <section className="bobu-legal-section">
          <h2>{t("support.account.title")}</h2>
          <p>{t("support.account.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("support.mining.title")}</h2>
          <p>{t("support.mining.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("support.gp.title")}</h2>
          <p>{t("support.gp.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("support.galaxy.title")}</h2>
          <p>{t("support.galaxy.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("support.privacy.title")}</h2>
          <p>{t("support.privacy.body")}</p>

          <div className="bobu-support-links">
            <Link to="/privacy">
              {t("home.footer.privacy")}
            </Link>

            <Link to="/terms">
              {t("home.footer.terms")}
            </Link>
          </div>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("support.contact.title")}</h2>

          <p>{t("support.contact.body")}</p>

          <a
            className="bobu-legal-contact bobu-support-email"
            href="mailto:support@bobunaut.com"
          >
            support@bobunaut.com
          </a>

          <p className="bobu-support-response">
            {t("support.contact.note")}
          </p>
        </section>
      </article>
    </main>
  );
}
