import { useLanguage } from "../../core/language";
import { LegalBackLink } from "./LegalBackLink";
import "./LegalPage.css";

export default function PrivacyPolicy() {
  const { t } = useLanguage();

  return (
    <main className="bobu-legal-page">
      <article className="bobu-legal-card">
        <LegalBackLink />

        <span className="bobu-legal-eyebrow">
          {t("legal.brand")}
        </span>

        <h1>{t("privacy.title")}</h1>

        <p className="bobu-legal-updated">
          {t("privacy.updated")}
        </p>

        <section className="bobu-legal-section">
          <h2>{t("privacy.section1.title")}</h2>
          <p>{t("privacy.section1.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("privacy.section2.title")}</h2>
          <p>{t("privacy.section2.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("privacy.section3.title")}</h2>
          <p>{t("privacy.section3.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("privacy.section4.title")}</h2>
          <p>{t("privacy.section4.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("privacy.section5.title")}</h2>
          <p>
            {t("privacy.section5.body")}{" "}
            <span className="bobu-legal-contact">
              bobuuniverse@gmail.com
            </span>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
