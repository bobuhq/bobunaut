type BuilderPassportActionsProps = {
  onDownload: () => void;
};

export default function BuilderPassportActions({
  onDownload,
}: BuilderPassportActionsProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        marginTop: "20px",
      }}
    >
      <button
        type="button"
        onClick={onDownload}
        style={{
          padding: "14px 18px",
          border: "none",
          borderRadius: "14px",
          fontSize: "15px",
          fontWeight: 800,
          cursor: "pointer",
          color: "#07111f",
          background: "linear-gradient(90deg, #14f195, #9945ff)",
        }}
      >
        Download Passport
      </button>
    </div>
  );
}
