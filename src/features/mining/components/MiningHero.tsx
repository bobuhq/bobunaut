import { Sparkles } from "lucide-react";
import { useLanguage } from "../../../core/language";

export default function MiningHero() {
  const { t } = useLanguage();

  return (
    <div className="mining-hero">
      <div className="mining-eyebrow">
        <Sparkles size={16} />
        {t("mining.hero.eyebrow")}
      </div>

      <h1 className="mining-title">
        {t("mining.hero.title")}
      </h1>

      <p className="mining-description">
        {t("mining.hero.description")}
      </p>
    </div>
  );
}
