import type {
  AresDiscoveryRecord,
} from "./AresDiscoveryArchiveService";

type Props = {
  record:
    AresDiscoveryRecord;

  onClose:
    () => void;
};

export function AresDiscoveryRecordPanel({
  record,
  onClose,
}: Props) {
  return (
      <div
      style={{
        position:
          "fixed",
        inset:
          0,
        zIndex:
          10000,
        display:
          "flex",
        alignItems:
          "flex-start",
        justifyContent:
          "flex-end",
        padding:
          "92px 24px 24px",
        background:
          "rgba(2,7,10,.78)",
        backdropFilter:
          "blur(8px)",
        pointerEvents:
          "auto",
        fontFamily:
          "Inter, system-ui, sans-serif",
      }}
      onClick={
        onClose
      }
    >
      <div
        style={{
          width:
            "min(380px, calc(100vw - 32px))",
          maxHeight:
            "calc(100vh - 120px)",
          padding:
            "14px",
          boxSizing:
            "border-box",
          overflowY:
            "auto",
          overscrollBehavior:
            "contain",
          border:
            "1px solid rgba(91,239,255,.38)",
          borderRadius:
            "16px",
          background:
            "linear-gradient(180deg, rgba(9,24,30,.98), rgba(4,11,15,.98))",
          boxShadow:
            "0 24px 80px rgba(0,0,0,.6), 0 0 42px rgba(45,223,241,.12)",
          color:
            "#fff",
        }}
        onClick={
          (
            event,
          ) =>
            event.stopPropagation()
        }
      >
        <div
          style={{
            color:
              "#72effb",
            fontSize:
              "10px",
            fontWeight:
              900,
            letterSpacing:
              ".2em",
            marginBottom:
              "8px",
          }}
        >
          BOBU MARS · DISCOVERY ARCHIVE
        </div>

        <div
          style={{
            fontSize:
              "19px",
            fontWeight:
              900,
            lineHeight:
              1.1,
            marginBottom:
              "6px",
          }}
        >
          {record.findingTitle}
        </div>

        <div
          style={{
            color:
              "#91aeb4",
            fontSize:
              "12px",
            marginBottom:
              "12px",
          }}
        >
          {record.missionTitle}
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap:
              "7px",
            marginBottom:
              "11px",
          }}
        >
          <Info
            label="CLASSIFICATION"
            value={
              record.classification
            }
          />

          <Info
            label="ARCHIVE CODE"
            value={
              record.archiveCode
            }
          />

          <Info
            label="SECTOR"
            value="ARES"
          />

          <Info
            label="STATUS"
            value="RESEARCH ARCHIVED"
          />
        </div>

        <div
          style={{
            padding:
              "13px 14px",
            border:
              "1px solid rgba(116,244,255,.16)",
            borderRadius:
              "12px",
            background:
              "rgba(74,220,235,.045)",
            color:
              "#c2d5d9",
            fontSize:
              "13px",
            lineHeight:
              1.65,
            marginBottom:
              "18px",
          }}
        >
          {record.findingSummary}
        </div>

        <div
          style={{
            color:
              "#708b91",
            fontSize:
              "9px",
            lineHeight:
              1.5,
            letterSpacing:
              ".04em",
            marginBottom:
              "12px",
          }}
        >
          BOBU exploration record. Gameplay classification only.
        </div>

        <button
          type="button"
          onClick={
            onClose
          }
          style={{
            width:
              "100%",
            padding:
              "11px 14px",
            position:
              "sticky",
            bottom:
              0,
            border:
              "1px solid rgba(104,240,252,.38)",
            borderRadius:
              "9px",
            background:
              "rgba(68,218,233,.1)",
            color:
              "#8ef6ff",
            fontSize:
              "11px",
            fontWeight:
              900,
            letterSpacing:
              ".12em",
            cursor:
              "pointer",
          }}
        >
          CLOSE RECORD
        </button>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label:
    string;
  value:
    string;
}) {
  return (
    <div
      style={{
        padding:
          "11px 12px",
        border:
          "1px solid rgba(255,255,255,.08)",
        borderRadius:
          "9px",
        background:
          "rgba(255,255,255,.025)",
      }}
    >
      <div
        style={{
          color:
            "#67848a",
          fontSize:
            "8px",
          fontWeight:
            900,
          letterSpacing:
            ".14em",
          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color:
            "#d6f5f7",
          fontSize:
            "11px",
          fontWeight:
            800,
        }}
      >
        {value}
      </div>
    </div>
  );
}
