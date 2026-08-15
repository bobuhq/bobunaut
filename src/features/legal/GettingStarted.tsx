import { Link } from "react-router-dom";

import { useLanguage } from "../../core/language";
import { LegalBackLink } from "./LegalBackLink";
import "./LegalPage.css";

export default function GettingStarted() {
  const { t } = useLanguage();

  return (
    <main className="bobu-legal-page">
      <article className="bobu-legal-card">
        <LegalBackLink />

        <span className="bobu-legal-eyebrow">
          {t("gettingStarted.eyebrow")}
        </span>

        <h1>{t("gettingStarted.title")}</h1>

        <p className="bobu-legal-updated">
          {t("gettingStarted.subtitle")}
        </p>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step1.title")}</h2>
          <p>{t("gettingStarted.step1.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step2.title")}</h2>
          <p>{t("gettingStarted.step2.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step3.title")}</h2>
          <p>{t("gettingStarted.step3.body")}</p>
          <div className="bobu-support-links">
            <Link to="/genesis">
              {t("gettingStarted.openGenesis")}
            </Link>
          </div>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step4.title")}</h2>
          <p>{t("gettingStarted.step4.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step5.title")}</h2>
          <p>{t("gettingStarted.step5.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step6.title")}</h2>
          <p>{t("gettingStarted.step6.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step7.title")}</h2>
          <p>{t("gettingStarted.step7.body")}</p>
          <div className="bobu-support-links">
            <Link to="/mining">
              {t("gettingStarted.openMining")}
            </Link>
          </div>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step8.title")}</h2>
          <p>{t("gettingStarted.step8.body")}</p>
          <div className="bobu-support-links">
            <Link to="/passport">
              {t("gettingStarted.openPassport")}
            </Link>
          </div>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step9.title")}</h2>
          <p>{t("gettingStarted.step9.body")}</p>
          <p>
            <strong>
              {t("gettingStarted.referralLead")}
            </strong>{" "}
            {t("gettingStarted.referralBody")}
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step10.title")}</h2>
          <p>{t("gettingStarted.step10.body")}</p>
          <div className="bobu-support-links">
            <Link to="/galaxy">
              {t("gettingStarted.openGalaxy")}
            </Link>
          </div>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step11.title")}</h2>
          <p>{t("gettingStarted.step11.body")}</p>
          <div className="bobu-support-links">
            <Link to="/missions">
              {t("gettingStarted.openMissions")}
            </Link>
          </div>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step12.title")}</h2>
          <p>{t("gettingStarted.step12.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step13.title")}</h2>
          <p>{t("gettingStarted.step13.body")}</p>
          <div className="bobu-support-links">
            <Link to="/wallet">
              {t("gettingStarted.openWallet")}
            </Link>
          </div>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.step14.title")}</h2>
          <p>{t("gettingStarted.step14.body")}</p>
        </section>

        <section className="bobu-legal-section">
          <h2>{t("gettingStarted.help.title")}</h2>
          <p>{t("gettingStarted.help.body")}</p>
          <div className="bobu-support-links">
            <Link to="/support">
              {t("gettingStarted.openSupport")}
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
