import { useAuthSession } from "../../core/auth/useAuthSession";
import { useBuilderStore } from "../identity/hooks/useBuilderStore";
import BuilderPassportActions from "./BuilderPassportActions";
import BuilderPassportShareCard from "./BuilderPassportShareCard";
import BuilderSignalWidget from "./BuilderSignalWidget";
type BuilderProfile = {
  username: string;
  displayName: string;
  role: string;
  level: number;
  builderPoints: number;
  inviteCode: string;

  joinedAt: string;
  walletAddress: string;
  status: "Active" | "Inactive";
};

const createBuilderProfile = (
  builder: ReturnType<typeof useBuilderStore>,
): BuilderProfile => ({
  username: builder.username,
  displayName: builder.username || "BOBU Builder",
  role: "Universe Explorer",
  level: builder.level,
  builderPoints: builder.gp,
  inviteCode: builder.inviteCode,

  joinedAt: "July 2026",
  walletAddress: builder.identity.wallet
    ? "Connected"
    : "Not connected",
  status: "Active",
});

export function BuilderPassport() {
  const builder = useBuilderStore();

  const { authenticated } = useAuthSession();

  const builderProfile = createBuilderProfile(builder);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "120px 24px 60px",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "32px",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          borderRadius: "24px",
          background:
            "linear-gradient(145deg, rgba(18, 20, 40, 0.96), rgba(8, 10, 24, 0.96))",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginBottom: "28px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              display: "grid",
              placeItems: "center",
              fontSize: "34px",
              background:
                "linear-gradient(135deg, rgba(153, 69, 255, 0.9), rgba(20, 241, 149, 0.9))",
              boxShadow: "0 12px 32px rgba(153, 69, 255, 0.28)",
            }}
          >
            🚀
          </div>

          <div>
            <p
              style={{
                margin: "0 0 6px",
                color: "#14f195",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Builder Passport
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                lineHeight: 1.1,
              }}
            >
              {builderProfile.displayName}
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "rgba(255, 255, 255, 0.62)",
              }}
            >
              @{builderProfile.username}
            </p>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <StatCard label="Level" value={builderProfile.level.toString()} />
          <StatCard
            label="GP Balance"
            value={builderProfile.builderPoints.toLocaleString()}
          />
        </div>

        <BuilderPassportActions
          onDownload={() =>
            document
              .getElementById("builder-passport-download-trigger")
              ?.click()
          }
        />
      </section>
      <BuilderSignalWidget
        authenticated={authenticated}
        inviteCode={
          authenticated
            ? builderProfile.inviteCode
            : undefined
        }
      />
    </main>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          color: "rgba(255, 255, 255, 0.55)",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>

      <strong
        style={{
          fontSize: "24px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

type ProfileRowProps = {
  label: string;
  value: string;
};

function ProfileRow({ label, value }: ProfileRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
      }}
    >
      <span
        style={{
          color: "rgba(255, 255, 255, 0.5)",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          textAlign: "right",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}