import {
  Copy,
  Download,
  Share2,
} from "lucide-react";

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
  return (
    <div className="builder-passport-actions">
      <button
        type="button"
        className="builder-passport-action"
        onClick={onCopyBuilderId}
      >
        <Copy size={15} />
        {copiedBuilderId ? "Builder ID Copied" : "Copy Builder ID"}
      </button>

      <button
        type="button"
        className="builder-passport-action"
        onClick={onShare}
      >
        <Share2 size={15} />
        Share Passport
      </button>

      <button
        type="button"
        className="builder-passport-action is-primary"
        onClick={onDownload}
      >
        <Download size={16} />
        Download Passport
      </button>
    </div>
  );
}
