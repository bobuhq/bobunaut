import {
  Copy,
  Download,
  Share2,
} from "lucide-react";
import { useLanguage } from "../../core/language";

type BuilderPassportActionsProps = {
  onDownload: () => void;
  onCopyBuilderId: () => void;
  onShare: () => void;
  copiedBuilderId: boolean;
};

export default function BuilderPassportActions({
  onDownload,
  onCopyBuilderId,
  onShare,
  copiedBuilderId,
}: BuilderPassportActionsProps) {
  const { t } = useLanguage();

  return (
    <div className="builder-passport-actions">
      <button
        type="button"
        className="builder-passport-action"
        onClick={onCopyBuilderId}
      >
        <Copy size={15} />
        {copiedBuilderId
          ? t("passport.actions.builderIdCopied")
          : t("passport.actions.copyBuilderId")}
      </button>

      <button
        type="button"
        className="builder-passport-action"
        onClick={onShare}
      >
        <Share2 size={15} />
        {t("passport.actions.share")}
      </button>

      <button
        type="button"
        className="builder-passport-action is-primary"
        onClick={onDownload}
      >
        <Download size={16} />
        {t("passport.actions.download")}
      </button>
    </div>
  );
}
