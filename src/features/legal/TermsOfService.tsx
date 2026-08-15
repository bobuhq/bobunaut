import { useLanguage } from "../../core/language";
import { LegalBackLink } from "./LegalBackLink";
import "./LegalPage.css";

export default function TermsOfService() {
  const { t } = useLanguage();

  return (
    <main className="bobu-legal-page">
      <article className="bobu-legal-card">
        <LegalBackLink />

        <span className="bobu-legal-eyebrow">
          {t("legal.brand")}
        </span>

        <h1>{t("terms.title")}</h1>

        <p className="bobu-legal-updated">
          {t("terms.updated")}
        </p>

        <section className="bobu-legal-section">
          <h2>{t("terms.section1.title")}</h2>
          <p>{t("terms.section1.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("terms.section2.title")}</h2>
          <p>{t("terms.section2.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("terms.section3.title")}</h2>
          <p>{t("terms.section3.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("terms.section4.title")}</h2>
          <ul>
            <li>{t("terms.section4.item1")}</li>
            <li>{t("terms.section4.item2")}</li>
            <li>{t("terms.section4.item3")}</li>
            <li>{t("terms.section4.item4")}</li>
          </ul>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("terms.section5.title")}</h2>
          <p>{t("terms.section5.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("terms.section6.title")}</h2>
          <p>
            {t("terms.section6.body")}{" "}
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
