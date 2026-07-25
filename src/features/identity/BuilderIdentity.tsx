import { IdentityCard } from "./components/IdentityCard";
import { useBuilderStore } from "./hooks/useBuilderStore";
import { builderStore } from "../../store/builderStore";
import type { IdentityProvider } from "../../core/models/Builder";
import "./BuilderIdentity.css";

interface CommunityTask {
  provider: IdentityProvider;
  label: string;
  description: string;
  actionLabel: string;
  communityUrl?: string;
  disabled?: boolean;
  required: boolean;
}

const communityTasks: CommunityTask[] = [
  {
    provider: "telegram",
    label: "Join BOBU Telegram",
    description:
      "Join the official BOBU Telegram community to enter the Genesis network.",
    actionLabel: "Join Telegram",
    communityUrl: "https://t.me/+I0Q01kVMYw41YjA0",
    required: true,
  },
  {
    provider: "x",
    label: "Follow BOBU on X",
    description:
      "Follow the official BOBU account for announcements, missions and launch updates.",
    actionLabel: "Follow on X",
    communityUrl: "https://x.com/bobu_hq",
    required: true,
  },
  {
    provider: "instagram",
    label: "Follow BOBU on Instagram",
    description:
      "Follow BOBU on Instagram and become part of the visual Universe journey.",
    actionLabel: "Follow Instagram",
    communityUrl:
      "https://www.instagram.com/bobu_universe?igsh=eGViZGJiOXFhNnR5&utm_source=qr",
    required: true,
  },
  {
    provider: "wallet",
    label: "Solana Wallet",
    description:
      "Wallet connection will become available for future on-chain rewards and claims.",
    actionLabel: "Coming Soon",
    disabled: true,
    required: false,
  },
];

export default function BuilderIdentity() {
  const builder = useBuilderStore();

  const requiredTasks = communityTasks.filter(
    (task) => task.required,
  );

  const completedCount = requiredTasks.filter(
    (task) => builder.identity[task.provider],
  ).length;

  const progress =
    (completedCount / requiredTasks.length) * 100;

  const handleTaskComplete = (
    provider: IdentityProvider,
  ): void => {
    if (provider === "wallet") {
      return;
    }

    builderStore.connectIdentity(provider);
  };

  return (
    <main className="builder-identity">
      <section className="builder-identity__hero">
        <span className="builder-identity__eyebrow">
          BOBU GENESIS ACCESS
        </span>

        <h1>Complete the Genesis Checkpoint</h1>

        <p>
          Join BOBU&apos;s official community channels to unlock
          your Builder Passport, activate GP and access missions.
        </p>
      </section>

      <section className="identity-dashboard">
        <div className="identity-summary">
          <div>
            <span className="identity-summary__label">
              Community Progress
            </span>

            <strong>
              {completedCount} / {requiredTasks.length}
            </strong>
          </div>

          <div
            className="identity-progress"
            role="progressbar"
            aria-label="Genesis Checkpoint progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="identity-progress__bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="identity-grid">
          {communityTasks.map((task) => (
            <IdentityCard
              key={task.provider}
              provider={task.provider}
              label={task.label}
              description={task.description}
              actionLabel={task.actionLabel}
              communityUrl={task.communityUrl}
              disabled={task.disabled}
              completed={
                builder.identity[task.provider]
              }
              onComplete={handleTaskComplete}
            />
          ))}
        </div>

        <div className="identity-unlocks">
          <div
            className={
              builder.passportUnlocked
                ? "is-unlocked"
                : ""
            }
          >
            <span>Builder Passport</span>
            <strong>
              {builder.passportUnlocked
                ? "Unlocked"
                : "Locked"}
            </strong>
          </div>

          <div
            className={
              builder.gpEnabled ? "is-unlocked" : ""
            }
          >
            <span>BOBU GP</span>
            <strong>
              {builder.gpEnabled ? "Active" : "Locked"}
            </strong>
          </div>

          <div
            className={
              builder.missionsUnlocked
                ? "is-unlocked"
                : ""
            }
          >
            <span>Missions</span>
            <strong>
              {builder.missionsUnlocked
                ? "Unlocked"
                : "Locked"}
            </strong>
          </div>
        </div>

        <div className="identity-test-panel">
          <span>Genesis Engine Test</span>

          <button
            type="button"
            disabled={!builder.gpEnabled}
            onClick={() =>
              builderStore.addGp(
                50,
                "genesis-checkpoint-test",
              )
            }
          >
            Add 50 GP
          </button>

          <strong>{builder.gp} GP</strong>

          <button
            type="button"
            onClick={builderStore.reset}
          >
            Reset Builder
          </button>
        </div>
      </section>
    </main>
  );
}
