import "./LegalPage.css";

export default function TermsOfService() {
  return (
    <main className="bobu-legal-page">
      <article className="bobu-legal-card">
        <span className="bobu-legal-eyebrow">
          BOBU Universe
        </span>

        <h1>Terms of Service</h1>

        <p className="bobu-legal-updated">
          Last updated: August 1, 2026
        </p>

        <section className="bobu-legal-section">
          <h2>1. Acceptance</h2>
          <p>
            By creating a Builder account or using
            BOBU Universe, you agree to these Terms
            of Service and the Privacy Policy.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>2. Builder Accounts</h2>
          <p>
            You are responsible for maintaining the
            security of your account, password and
            connected identities. Account
            information must be accurate and must
            not impersonate another person.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>3. GP and Rewards</h2>
          <p>
            GP, mining rewards and other in-platform
            balances are governed by BOBU Universe
            rules. Internal GP is not transferable
            until all required activation,
            eligibility, security and wallet stages
            have been completed.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>4. Prohibited Conduct</h2>
          <ul>
            <li>
              Creating fraudulent or duplicate
              accounts.
            </li>
            <li>
              Manipulating rewards, referrals or
              mining activity.
            </li>
            <li>
              Attempting unauthorized access to
              accounts, systems or data.
            </li>
            <li>
              Using automation or abuse techniques
              not expressly permitted by BOBU
              Universe.
            </li>
          </ul>
        </section>

        <section className="bobu-legal-section">
          <h2>5. Service Development</h2>
          <p>
            BOBU Universe is under active
            development. Features, eligibility
            requirements, reward systems and service
            availability may change as the universe
            evolves.
          </p>
        </section>

        <section className="bobu-legal-section">
          <h2>6. Contact</h2>
          <p>
            Questions regarding these terms may be
            sent to{" "}
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
