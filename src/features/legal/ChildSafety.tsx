import { useLanguage } from "../../core/language";
import { LegalBackLink } from "./LegalBackLink";
import "./LegalPage.css";

export default function ChildSafety() {
  const { t } = useLanguage();

  return (
    <main className="bobu-legal-page">
      <article className="bobu-legal-card">
        <LegalBackLink />

        <span className="bobu-legal-eyebrow">
          {t("legal.brand")}
        </span>

        <h1>{t("childSafety.title")}</h1>

        <p className="bobu-legal-updated">
          {t("childSafety.updated")}
        </p>

        <section className="bobu-legal-section">
          <h2>{t("childSafety.section1.title")}</h2>
          <p>{t("childSafety.section1.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("childSafety.section2.title")}</h2>
          <p>{t("childSafety.section2.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("childSafety.section3.title")}</h2>
          <p>{t("childSafety.section3.body")}</p>
          <p>
            {t("childSafety.section3.report")}{" "}
            <span className="bobu-legal-contact">
              bobuuniverse@gmail.com
            </span>
            .
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("childSafety.section4.title")}</h2>
          <p>{t("childSafety.section4.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("childSafety.section5.title")}</h2>
          <p>{t("childSafety.section5.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("childSafety.section6.title")}</h2>
          <p>{t("childSafety.section6.body")}</p>
          <p>
            <span className="bobu-legal-contact">
              bobuuniverse@gmail.com
            </span>
          </p>
        </section>
      </article>
    </main>
  );
}
