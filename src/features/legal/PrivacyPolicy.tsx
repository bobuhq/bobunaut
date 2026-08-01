import "./LegalPage.css";

export default function PrivacyPolicy() {
  return (
    <main className="bobu-legal-page">
      <article className="bobu-legal-card">
        <span className="bobu-legal-eyebrow">
          BOBU Universe
        </span>

        <h1>Privacy Policy</h1>

        <p className="bobu-legal-updated">
          Last updated: August 1, 2026
        </p>

        <section className="bobu-legal-section">
          <h2>1. Information We Collect</h2>
          <p>
            We may collect account information,
            authentication identifiers, Builder
            profile data, activity records, GP
            balances, referral information and
            security-related technical data required
            to operate BOBU Universe.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>2. How We Use Information</h2>
          <p>
            Information is used to authenticate
            Builders, maintain Builder Passports,
            calculate server-authoritative rewards,
            operate mining sessions, prevent abuse,
            protect accounts and improve the BOBU
            Universe experience.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>3. Authentication Providers</h2>
          <p>
            Authentication may be provided through
            email, Google and other supported
            identity providers. These providers may
            process information according to their
            own privacy policies.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>4. Data Security</h2>
          <p>
            We apply access controls, server-side
            validation, database security policies
            and security monitoring to protect
            Builder information. No internet service
            can guarantee absolute security.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>5. Contact</h2>
          <p>
            Privacy questions may be sent to{" "}
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
