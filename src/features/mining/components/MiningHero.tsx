import { Sparkles } from "lucide-react";

export default function MiningHero() {
  return (
    <div className="mining-hero">
      <div className="mining-eyebrow">
        <Sparkles size={16} />
        BOBU Universe Protocol
      </div>

      <h1 className="mining-title">
        Builder Mining
      </h1>

      <p className="mining-description">
        Activate your daily mining session, collect
        GP and strengthen your reputation
        across the BOBU Universe.
      </p>
    </div>
  );
}
