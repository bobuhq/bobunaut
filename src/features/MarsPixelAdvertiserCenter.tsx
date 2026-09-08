import {
  useEffect,
  useState,
} from "react";

import {
  getMyMarsPixelAdAnalytics,
  getMyMarsPixelAdvertiserCenter,
  type MarsPixelAdAnalytics,
  type MarsPixelAdvertiserCenterTerritory,
} from "../core/mars/MarsPixelNetworkService";

export function MarsPixelAdvertiserCenter() {
  const [territories, setTerritories] = useState<
    MarsPixelAdvertiserCenterTerritory[]
  >([]);
  const [analytics, setAnalytics] = useState<
    MarsPixelAdAnalytics[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyMarsPixelAdvertiserCenter(),
      getMyMarsPixelAdAnalytics(30),
    ])
      .then(([territoryRows, analyticsRows]) => {
        if (!active) {
          return;
        }

        setTerritories(territoryRows);
        setAnalytics(analyticsRows);
        setError(null);
      })
      .catch((value: unknown) => {
        if (!active) {
          return;
        }

        console.error(
          "Mars Pixel Advertiser Center test failed.",
          value,
        );

        setError(
          value instanceof Error
            ? value.message
            : "Unknown Advertiser Center error",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      style={{
        width: "min(1180px, calc(100% - 32px))",
        margin: "0 auto",
        padding: "110px 0 60px",
        color: "#fff",
      }}
    >
      <div
        style={{
          padding: "24px",
          border:
            "1px solid rgba(255,255,255,0.14)",
          borderRadius: "20px",
          background: "rgba(8,10,22,0.86)",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "0.18em",
            opacity: 0.65,
          }}
        >
          LOCAL V39 TEST
        </div>

        <h1>Mars Pixel Advertiser Center</h1>

        {loading ? (
          <p>Loading owner territories...</p>
        ) : null}

        {error ? (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              color: "#ff9b9b",
            }}
          >
            {error}
          </pre>
        ) : null}

        {!loading && !error ? (
          <>
            <h2>
              Owned Territories: {territories.length}
            </h2>

            <h2>V40 Analytics · 30 Days</h2>

            <pre
              style={{
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(analytics, null, 2)}
            </pre>

            {territories.map((territory) => (
              <article
                key={territory.allocation_id}
                style={{
                  marginTop: "16px",
                  padding: "18px",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "14px",
                  background:
                    "rgba(255,255,255,0.04)",
                }}
              >
                <strong>
                  {territory.creative_title ||
                    territory.advertiser_name ||
                    "Mars Pixel Territory"}
                </strong>

                <pre
                  style={{
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  {JSON.stringify(
                    territory,
                    null,
                    2,
                  )}
                </pre>
              </article>
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}
