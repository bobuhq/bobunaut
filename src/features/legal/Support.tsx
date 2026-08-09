import { Link } from "react-router-dom";

import "./LegalPage.css";

export default function Support() {
  return (
    <main className="bobu-legal-page">
      <article className="bobu-legal-card">
        <span className="bobu-legal-eyebrow">
          BOBU NETWORK
        </span>

        <h1>Help & Support</h1>

        <p className="bobu-legal-updated">
          Support for BOBU Network and the BOBU Universe
        </p>

        <section className="bobu-legal-section">
          <h2>Account & Builder Identity</h2>
          <p>
            Get help with sign-in, account access,
            Builder identity, Builder Passport and
            authentication-related issues.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>Mining Sessions</h2>
          <p>
            Get support with starting or restoring
            24-hour mining sessions and understanding
            your current mining status.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>GP & Missions</h2>
          <p>
            Learn about GP balances, completed
            activities, mission rewards and
            server-authoritative reward processing.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>Galaxy & Referrals</h2>
          <p>
            Get help with invite codes, referral
            attribution, your Galaxy network and
            referral activation status.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>Privacy & Security</h2>
          <p>
            Review how BOBU protects Builder accounts
            and handles personal information.
          </p>

          <div className="bobu-support-links">
            <Link to="/privacy">
              Privacy Policy
            </Link>

            <Link to="/terms">
              Terms of Service
            </Link>
          </div>
        </section>

        <section className="bobu-legal-section">
          <h2>Contact Support</h2>

          <p>
            For account, technical or application
            support, contact:
          </p>

          <a
            className="bobu-legal-contact bobu-support-email"
            href="mailto:support@bobunaut.com"
          >
            support@bobunaut.com
          </a>

          <p className="bobu-support-response">
            Please include a clear description of the
            issue and, when relevant, your Builder ID.
            Never send passwords or private security
            credentials by email.
          </p>
        </section>
      </article>
    </main>
  );
}
