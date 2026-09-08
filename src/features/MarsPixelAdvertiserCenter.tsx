import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deleteMarsPixelCreativeImage,
  getMarsPixelContentTier,
  getMyMarsPixelAdAnalytics,
  getMyMarsPixelAdvertiserCenter,
  saveMarsPixelCreative,
  uploadMarsPixelCreativeImage,
  type MarsPixelAdAnalytics,
  type MarsPixelAdvertiserCenterTerritory,
  type MarsPixelContentTier,
} from "../core/mars/MarsPixelNetworkService";

import "./MarsPixelAdvertiserCenter.css";

type AnalyticsPeriod = 7 | 30 | 90;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatStatus(value: string | null | undefined) {
  if (!value) {
    return "NOT CONFIGURED";
  }

  return value
    .replaceAll("_", " ")
    .toUpperCase();
}

export function MarsPixelAdvertiserCenter() {
  const [territories, setTerritories] = useState<
    MarsPixelAdvertiserCenterTerritory[]
  >([]);

  const [analytics, setAnalytics] = useState<
    MarsPixelAdAnalytics[]
  >([]);

  const [period, setPeriod] =
    useState<AnalyticsPeriod>(30);

  const [
    selectedAllocationId,
    setSelectedAllocationId,
  ] = useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [creativeTitle, setCreativeTitle] =
    useState("");

  const [
    creativeDescription,
    setCreativeDescription,
  ] = useState("");

  const [creativeImageUrl, setCreativeImageUrl] =
    useState("");

  const [creativeImageFile, setCreativeImageFile] =
    useState<File | null>(null);

  const [
    creativeDestinationUrl,
    setCreativeDestinationUrl,
  ] = useState("");

  const [creativeCtaLabel, setCreativeCtaLabel] =
    useState("");

  const [contentTier, setContentTier] =
    useState<MarsPixelContentTier | null>(null);

  const [editorLoading, setEditorLoading] =
    useState(false);

  const [editorError, setEditorError] =
    useState<string | null>(null);

  const [editorSuccess, setEditorSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);

    void Promise.all([
      getMyMarsPixelAdvertiserCenter(),
      getMyMarsPixelAdAnalytics(period),
    ])
      .then(([territoryRows, analyticsRows]) => {
        if (!active) {
          return;
        }

        setTerritories(territoryRows);
        setAnalytics(analyticsRows);

        setSelectedAllocationId((current) => {
          if (
            current &&
            territoryRows.some(
              (territory) =>
                territory.allocation_id === current,
            )
          ) {
            return current;
          }

          return (
            territoryRows[0]?.allocation_id ??
            null
          );
        });

        setError(null);
      })
      .catch((value: unknown) => {
        if (!active) {
          return;
        }

        console.error(
          "Mars Pixel Advertiser Center failed.",
          value,
        );

        setError(
          value instanceof Error
            ? value.message
            : "Unable to load advertiser data.",
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
  }, [period]);

  const analyticsByAllocation =
    useMemo(() => {
      return new Map(
        analytics.map((row) => [
          row.allocation_id,
          row,
        ]),
      );
    }, [analytics]);

  const totals =
    useMemo(() => {
      const impressions = analytics.reduce(
        (sum, row) => sum + row.impressions,
        0,
      );

      const cardOpens = analytics.reduce(
        (sum, row) => sum + row.card_opens,
        0,
      );

      const ctaClicks = analytics.reduce(
        (sum, row) => sum + row.cta_clicks,
        0,
      );

      const ctr =
        impressions > 0
          ? (ctaClicks / impressions) * 100
          : 0;

      return {
        impressions,
        cardOpens,
        ctaClicks,
        ctr,
      };
    }, [analytics]);

  const totalPixels =
    useMemo(
      () =>
        territories.reduce(
          (sum, territory) =>
            sum + territory.pixel_count,
          0,
        ),
      [territories],
    );

  const activeAds =
    useMemo(
      () =>
        territories.filter(
          (territory) =>
            territory.creative_status === "active",
        ).length,
      [territories],
    );

  const selectedTerritory =
    territories.find(
      (territory) =>
        territory.allocation_id ===
        selectedAllocationId,
    ) ?? null;

  const selectedAnalytics =
    selectedTerritory
      ? analyticsByAllocation.get(
          selectedTerritory.allocation_id,
        ) ?? null
      : null;

  useEffect(() => {
    let active = true;

    setEditorOpen(false);
    setEditorError(null);
    setEditorSuccess(null);
    setCreativeImageFile(null);

    if (!selectedTerritory) {
      setContentTier(null);
      setCreativeTitle("");
      setCreativeDescription("");
      setCreativeImageUrl("");
      setCreativeDestinationUrl("");
      setCreativeCtaLabel("");

      return () => {
        active = false;
      };
    }

    setCreativeTitle(
      selectedTerritory.creative_title ?? "",
    );

    setCreativeDescription(
      selectedTerritory.creative_description ?? "",
    );

    setCreativeImageUrl(
      selectedTerritory.creative_image_url ?? "",
    );

    setCreativeDestinationUrl(
      selectedTerritory.creative_destination_url ?? "",
    );

    setCreativeCtaLabel(
      selectedTerritory.creative_cta_label ?? "",
    );

    void getMarsPixelContentTier(
      selectedTerritory.pixel_count,
    )
      .then((tier) => {
        if (active) {
          setContentTier(tier);
        }
      })
      .catch((value: unknown) => {
        if (!active) {
          return;
        }

        console.error(
          "Mars Pixel advertiser tier lookup failed.",
          value,
        );

        setContentTier(null);
      });

    return () => {
      active = false;
    };
  }, [
    selectedTerritory?.allocation_id,
    selectedTerritory?.creative_cta_label,
    selectedTerritory?.creative_description,
    selectedTerritory?.creative_destination_url,
    selectedTerritory?.creative_image_url,
    selectedTerritory?.creative_title,
    selectedTerritory?.pixel_count,
  ]);

  const handleCreativeSave = async () => {
    if (
      !selectedTerritory ||
      !contentTier ||
      editorLoading
    ) {
      return;
    }

    const title = creativeTitle.trim();

    if (!title) {
      setEditorError("Ad title is required.");
      setEditorSuccess(null);
      return;
    }

    if (
      title.length >
      contentTier.territory_name_max_chars
    ) {
      setEditorError(
        `Title can contain up to ${contentTier.territory_name_max_chars} characters.`,
      );
      setEditorSuccess(null);
      return;
    }

    if (
      creativeDescription.trim().length >
      contentTier.description_max_chars
    ) {
      setEditorError(
        `Description can contain up to ${contentTier.description_max_chars} characters.`,
      );
      setEditorSuccess(null);
      return;
    }

    setEditorLoading(true);
    setEditorError(null);
    setEditorSuccess(null);

    let uploadedObjectPath: string | null = null;

    try {
      let finalImageUrl =
        creativeImageUrl.trim();

      if (
        contentTier.image_allowed &&
        creativeImageFile
      ) {
        const upload =
          await uploadMarsPixelCreativeImage(
            selectedTerritory.allocation_id,
            creativeImageFile,
          );

        finalImageUrl = upload.publicUrl;
        uploadedObjectPath = upload.objectPath;
      }

      const result =
        await saveMarsPixelCreative({
          allocationId:
            selectedTerritory.allocation_id,
          title,
          description:
            creativeDescription.trim(),
          imageUrl: contentTier.image_allowed
            ? finalImageUrl
            : undefined,
          destinationUrl:
            creativeDestinationUrl.trim(),
          ctaLabel: contentTier.cta_allowed
            ? creativeCtaLabel.trim()
            : undefined,
          links: selectedTerritory.creative_links,
        });

      setCreativeImageUrl(finalImageUrl);
      setCreativeImageFile(null);

      setTerritories((current) =>
        current.map((territory) =>
          territory.allocation_id ===
          selectedTerritory.allocation_id
            ? {
                ...territory,
                creative_id:
                  result.creative_id,
                creative_status:
                  result.creative_status,
                creative_title: title,
                creative_description:
                  creativeDescription.trim() ||
                  null,
                creative_image_url:
                  finalImageUrl || null,
                creative_destination_url:
                  creativeDestinationUrl.trim() ||
                  null,
                creative_cta_label:
                  contentTier.cta_allowed
                    ? creativeCtaLabel.trim() ||
                      null
                    : null,
              }
            : territory,
        ),
      );

      setEditorSuccess(
        `Creative submitted · ${result.creative_status.toUpperCase()}`,
      );
    } catch (value: unknown) {
      if (uploadedObjectPath) {
        try {
          await deleteMarsPixelCreativeImage(
            uploadedObjectPath,
          );
        } catch (cleanupError) {
          console.error(
            "Mars Pixel advertiser upload cleanup failed.",
            cleanupError,
          );
        }
      }

      setEditorError(
        value instanceof Error
          ? value.message
          : "Creative submission failed.",
      );
    } finally {
      setEditorLoading(false);
    }
  };

  return (
    <main className="mars-advertiser">
      <div className="mars-advertiser__shell">
        <header className="mars-advertiser__hero">
          <div>
            <div className="mars-advertiser__eyebrow">
              MARS PIXEL / ADVERTISER CENTER
            </div>

            <h1>
              Your Mars advertising command center.
            </h1>

            <p>
              Manage your owned Mars Pixel territories,
              monitor campaign performance and control
              your active creative from one place.
            </p>
          </div>

          <div className="mars-advertiser__periods">
            {([7, 30, 90] as AnalyticsPeriod[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    period === value
                      ? "is-active"
                      : ""
                  }
                  onClick={() => setPeriod(value)}
                >
                  {value}D
                </button>
              ),
            )}
          </div>
        </header>

        {error ? (
          <div className="mars-advertiser__error">
            <strong>
              Advertiser Center unavailable
            </strong>
            <span>{error}</span>
          </div>
        ) : null}

        <section className="mars-advertiser__metrics">
          <article className="mars-advertiser__metric">
            <span>IMPRESSIONS</span>
            <strong>
              {loading
                ? "—"
                : formatNumber(
                    totals.impressions,
                  )}
            </strong>
            <small>
              Visible ad views / {period} days
            </small>
          </article>

          <article className="mars-advertiser__metric">
            <span>CARD OPENS</span>
            <strong>
              {loading
                ? "—"
                : formatNumber(
                    totals.cardOpens,
                  )}
            </strong>
            <small>
              Territory ad interactions
            </small>
          </article>

          <article className="mars-advertiser__metric">
            <span>CTA CLICKS</span>
            <strong>
              {loading
                ? "—"
                : formatNumber(
                    totals.ctaClicks,
                  )}
            </strong>
            <small>
              Outbound campaign clicks
            </small>
          </article>

          <article className="mars-advertiser__metric">
            <span>CTR</span>
            <strong>
              {loading
                ? "—"
                : formatPercent(
                    totals.ctr,
                  )}
            </strong>
            <small>
              Clicks / impressions
            </small>
          </article>
        </section>

        <section className="mars-advertiser__summary">
          <div>
            <span>OWNED TERRITORIES</span>
            <strong>{territories.length}</strong>
          </div>

          <div>
            <span>TOTAL PIXELS</span>
            <strong>
              {formatNumber(totalPixels)}
            </strong>
          </div>

          <div>
            <span>ACTIVE ADS</span>
            <strong>{activeAds}</strong>
          </div>
        </section>

        <div className="mars-advertiser__workspace">
          <section className="mars-advertiser__territories">
            <div className="mars-advertiser__section-heading">
              <div>
                <span>PORTFOLIO</span>
                <h2>My Territories</h2>
              </div>

              <small>
                {territories.length} owned
              </small>
            </div>

            {loading ? (
              <div className="mars-advertiser__empty">
                Loading Mars Pixel territories...
              </div>
            ) : null}

            {!loading &&
            territories.length === 0 ? (
              <div className="mars-advertiser__empty">
                No owned Mars Pixel territory was
                found for this account.
              </div>
            ) : null}

            <div className="mars-advertiser__territory-list">
              {territories.map((territory) => {
                const rowAnalytics =
                  analyticsByAllocation.get(
                    territory.allocation_id,
                  );

                const selected =
                  territory.allocation_id ===
                  selectedAllocationId;

                return (
                  <button
                    key={
                      territory.allocation_id
                    }
                    type="button"
                    className={[
                      "mars-advertiser__territory",
                      selected
                        ? "is-selected"
                        : "",
                    ].join(" ")}
                    onClick={() =>
                      setSelectedAllocationId(
                        territory.allocation_id,
                      )
                    }
                  >
                    <div className="mars-advertiser__territory-top">
                      <div>
                        <strong>
                          {territory.creative_title ||
                            territory.advertiser_name ||
                            "Mars Pixel Territory"}
                        </strong>

                        <span>
                          {territory.width} ×{" "}
                          {territory.height} /{" "}
                          {territory.pixel_count} PIXELS
                        </span>
                      </div>

                      <span className="mars-advertiser__status">
                        {formatStatus(
                          territory.creative_status,
                        )}
                      </span>
                    </div>

                    <div className="mars-advertiser__coords">
                      X {territory.x_start} / Y{" "}
                      {territory.y_start}
                    </div>

                    <div className="mars-advertiser__territory-stats">
                      <div>
                        <span>Views</span>
                        <strong>
                          {formatNumber(
                            rowAnalytics?.impressions ??
                              0,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Opens</span>
                        <strong>
                          {formatNumber(
                            rowAnalytics?.card_opens ??
                              0,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Clicks</span>
                        <strong>
                          {formatNumber(
                            rowAnalytics?.cta_clicks ??
                              0,
                          )}
                        </strong>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mars-advertiser__creative-panel">
            <div className="mars-advertiser__section-heading">
              <div>
                <span>CAMPAIGN</span>
                <h2>Active Creative</h2>
              </div>

              {selectedTerritory ? (
                <span className="mars-advertiser__status">
                  {formatStatus(
                    selectedTerritory.creative_status,
                  )}
                </span>
              ) : null}
            </div>

            {selectedTerritory ? (
              <>
                <div className="mars-advertiser__creative-preview">
                  {selectedTerritory.creative_image_url ? (
                    <img
                      src={
                        selectedTerritory.creative_image_url
                      }
                      alt={
                        selectedTerritory.creative_title ||
                        "Mars Pixel creative"
                      }
                    />
                  ) : (
                    <div className="mars-advertiser__creative-placeholder">
                      NO CREATIVE IMAGE
                    </div>
                  )}

                  <div className="mars-advertiser__creative-copy">
                    <span>
                      {
                        selectedTerritory.advertiser_name
                      }
                    </span>

                    <h3>
                      {selectedTerritory.creative_title ||
                        "Untitled Creative"}
                    </h3>

                    <p>
                      {selectedTerritory.creative_description ||
                        "No campaign description has been configured yet."}
                    </p>

                    {selectedTerritory.creative_destination_url ? (
                      <a
                        href={
                          selectedTerritory.creative_destination_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedTerritory.creative_cta_label ||
                          "EXPLORE"}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mars-advertiser__creative-stats">
                  <div>
                    <span>IMPRESSIONS</span>
                    <strong>
                      {formatNumber(
                        selectedAnalytics?.impressions ??
                          0,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>CARD OPENS</span>
                    <strong>
                      {formatNumber(
                        selectedAnalytics?.card_opens ??
                          0,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>CTA CLICKS</span>
                    <strong>
                      {formatNumber(
                        selectedAnalytics?.cta_clicks ??
                          0,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>CTR</span>
                    <strong>
                      {formatPercent(
                        selectedAnalytics?.ctr ??
                          0,
                      )}
                    </strong>
                  </div>
                </div>

                <div className="mars-advertiser__creative-meta">
                  <div>
                    <span>ALLOCATION</span>
                    <strong>
                      {
                        selectedTerritory.allocation_id
                      }
                    </strong>
                  </div>

                  <div>
                    <span>COLOR KEY</span>
                    <strong>
                      {selectedTerritory.color_key ??
                        "DEFAULT"}
                    </strong>
                  </div>
                </div>

                <div className="mars-advertiser__manager">
                  <div className="mars-advertiser__manager-head">
                    <div>
                      <span>AD MANAGER</span>
                      <strong>
                        Manage Creative
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditorOpen(
                          (current) => !current,
                        )
                      }
                    >
                      {editorOpen
                        ? "CLOSE EDITOR"
                        : "EDIT AD"}
                    </button>
                  </div>

                  {editorOpen ? (
                    <div className="mars-advertiser__editor">
                      <label>
                        <span>AD TITLE</span>
                        <input
                          type="text"
                          value={creativeTitle}
                          maxLength={
                            contentTier
                              ?.territory_name_max_chars
                          }
                          onChange={(event) =>
                            setCreativeTitle(
                              event.target.value,
                            )
                          }
                          placeholder="Campaign title"
                        />
                        <small>
                          {creativeTitle.length} /{" "}
                          {contentTier
                            ?.territory_name_max_chars ??
                            "—"}
                        </small>
                      </label>

                      <label>
                        <span>DESCRIPTION</span>
                        <textarea
                          value={
                            creativeDescription
                          }
                          maxLength={
                            contentTier
                              ?.description_max_chars
                          }
                          onChange={(event) =>
                            setCreativeDescription(
                              event.target.value,
                            )
                          }
                          placeholder="Tell visitors about your project."
                          rows={4}
                        />
                        <small>
                          {
                            creativeDescription.length
                          }{" "}
                          /{" "}
                          {contentTier
                            ?.description_max_chars ??
                            "—"}
                        </small>
                      </label>

                      {contentTier?.image_allowed ? (
                        <label>
                          <span>CREATIVE IMAGE</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                              setCreativeImageFile(
                                event.target
                                  .files?.[0] ??
                                  null,
                              )
                            }
                          />
                          <small>
                            JPG, PNG or WebP · max 5 MB
                            {creativeImageFile
                              ? ` · ${creativeImageFile.name}`
                              : ""}
                          </small>
                        </label>
                      ) : null}

                      <label>
                        <span>DESTINATION URL</span>
                        <input
                          type="url"
                          value={
                            creativeDestinationUrl
                          }
                          onChange={(event) =>
                            setCreativeDestinationUrl(
                              event.target.value,
                            )
                          }
                          placeholder="https://example.com"
                        />
                      </label>

                      {contentTier?.cta_allowed ? (
                        <label>
                          <span>CTA LABEL</span>
                          <input
                            type="text"
                            value={
                              creativeCtaLabel
                            }
                            onChange={(event) =>
                              setCreativeCtaLabel(
                                event.target.value,
                              )
                            }
                            placeholder="EXPLORE NOW"
                          />
                        </label>
                      ) : null}

                      {editorError ? (
                        <div className="mars-advertiser__editor-message is-error">
                          {editorError}
                        </div>
                      ) : null}

                      {editorSuccess ? (
                        <div className="mars-advertiser__editor-message is-success">
                          {editorSuccess}
                        </div>
                      ) : null}

                      <div className="mars-advertiser__editor-actions">
                        <span>
                          Saving creates a moderated
                          creative revision.
                        </span>

                        <button
                          type="button"
                          disabled={
                            editorLoading ||
                            !contentTier
                          }
                          onClick={() =>
                            void handleCreativeSave()
                          }
                        >
                          {editorLoading
                            ? "SUBMITTING..."
                            : "SAVE & SUBMIT"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mars-advertiser__manager-copy">
                      Update your campaign image,
                      message, destination and CTA.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="mars-advertiser__empty">
                Select a territory to inspect its
                campaign.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
