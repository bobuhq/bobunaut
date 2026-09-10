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

import { useLanguage } from "../core/language";

import "./MarsPixelAdvertiserCenter.css";

type AnalyticsPeriod = 7 | 30 | 90;

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}


export function MarsPixelAdvertiserCenter() {
  const { t, language } = useLanguage();

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(language).format(value);

  const formatStatusLocalized = (
    value: string | null | undefined,
  ) => {
    if (!value) {
      return t("mars.advertiser.status.notConfigured");
    }

    switch (value) {
      case "active":
        return t("mars.advertiser.status.active");
      case "under_review":
        return t("mars.advertiser.status.underReview");
      case "rejected":
        return t("mars.advertiser.status.rejected");
      case "draft":
        return t("mars.advertiser.status.draft");
      case "paused":
        return t("mars.advertiser.status.paused");
      default:
        return value.replaceAll("_", " ").toUpperCase();
    }
  };

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
            : t("mars.advertiser.error.loadFailed"),
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
  }, [period, t]);

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

  const campaignStage = useMemo(() => {
    if (!selectedTerritory) {
      return 0;
    }

    const status = selectedTerritory.creative_status;

    if (status === "active") {
      return 4;
    }

    if (
      status === "under_review" ||
      status === "rejected" ||
      status === "paused"
    ) {
      return 3;
    }

    return 2;
  }, [selectedTerritory]);

  const campaignSteps = [
    {
      number: 1,
      title: "Territory Secured",
      detail: "Your Mars Pixel territory is owned.",
    },
    {
      number: 2,
      title: "Creative Setup",
      detail: "Add your brand, image and destination.",
    },
    {
      number: 3,
      title: "Review",
      detail: "Submit your creative for moderation.",
    },
    {
      number: 4,
      title: "Live on Mars",
      detail: "Your approved campaign becomes visible.",
    },
  ];

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
      setEditorError(t("mars.advertiser.error.titleRequired"));
      setEditorSuccess(null);
      return;
    }

    if (
      title.length >
      contentTier.territory_name_max_chars
    ) {
      setEditorError(
        t("mars.advertiser.error.titleMax", {
          count: contentTier.territory_name_max_chars,
        }),
      );
      setEditorSuccess(null);
      return;
    }

    if (
      creativeDescription.trim().length >
      contentTier.description_max_chars
    ) {
      setEditorError(
        t("mars.advertiser.error.descriptionMax", {
          count: contentTier.description_max_chars,
        }),
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
        t("mars.advertiser.submittedStatus", {
          status: formatStatusLocalized(
            result.creative_status,
          ),
        }),
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
          : t("mars.advertiser.error.submissionFailed"),
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
              {t("mars.advertiser.eyebrow")}
            </div>

            <h1>
              {t("mars.advertiser.title")}
            </h1>

            <p>
              {t("mars.advertiser.subtitle")}
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
              {t("mars.advertiser.unavailable")}
            </strong>
            <span>{error}</span>
          </div>
        ) : null}

        <section className="mars-advertiser__metrics">
          <article className="mars-advertiser__metric">
            <span>{t("mars.advertiser.impressions")}</span>
            <strong>
              {loading
                ? "—"
                : formatNumber(
                    totals.impressions,
                  )}
            </strong>
            <small>
              {t("mars.advertiser.visibleViews", { count: period })}
            </small>
          </article>

          <article className="mars-advertiser__metric">
            <span>{t("mars.advertiser.cardOpens")}</span>
            <strong>
              {loading
                ? "—"
                : formatNumber(
                    totals.cardOpens,
                  )}
            </strong>
            <small>
              {t("mars.advertiser.territoryInteractions")}
            </small>
          </article>

          <article className="mars-advertiser__metric">
            <span>{t("mars.advertiser.ctaClicks")}</span>
            <strong>
              {loading
                ? "—"
                : formatNumber(
                    totals.ctaClicks,
                  )}
            </strong>
            <small>
              {t("mars.advertiser.outboundClicks")}
            </small>
          </article>

          <article className="mars-advertiser__metric">
            <span>{t("mars.advertiser.ctr")}</span>
            <strong>
              {loading
                ? "—"
                : formatPercent(
                    totals.ctr,
                  )}
            </strong>
            <small>
              {t("mars.advertiser.clicksImpressions")}
            </small>
          </article>
        </section>

        <section className="mars-advertiser__summary">
          <div>
            <span>{t("mars.advertiser.ownedTerritories")}</span>
            <strong>{territories.length}</strong>
          </div>

          <div>
            <span>{t("mars.advertiser.totalPixels")}</span>
            <strong>
              {formatNumber(totalPixels)}
            </strong>
          </div>

          <div>
            <span>{t("mars.advertiser.activeAds")}</span>
            <strong>{activeAds}</strong>
          </div>
        </section>

        <section
          className="mars-advertiser__journey"
          aria-label="Mars Pixel campaign journey"
        >
          <div className="mars-advertiser__journey-head">
            <div>
              <span>CAMPAIGN JOURNEY</span>
              <h2>From territory to live campaign</h2>
            </div>

            <strong>
              {campaignStage === 0
                ? "Start by securing a territory"
                : `Step ${campaignStage} of 4`}
            </strong>
          </div>

          <div className="mars-advertiser__journey-steps">
            {campaignSteps.map((step) => {
              const complete = step.number < campaignStage;
              const current = step.number === campaignStage;

              return (
                <div
                  key={step.number}
                  className={[
                    "mars-advertiser__journey-step",
                    complete ? "is-complete" : "",
                    current ? "is-current" : "",
                  ].join(" ")}
                >
                  <div className="mars-advertiser__journey-number">
                    {complete ? "✓" : step.number}
                  </div>

                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mars-advertiser__workspace">
          <section className="mars-advertiser__territories">
            <div className="mars-advertiser__section-heading">
              <div>
                <span>{t("mars.advertiser.portfolio")}</span>
                <h2>{t("mars.advertiser.myTerritories")}</h2>
              </div>

              <small>
                {t("mars.advertiser.ownedCount", {
                  count: territories.length,
                })}
              </small>
            </div>

            {loading ? (
              <div className="mars-advertiser__empty">
                {t("mars.advertiser.loadingTerritories")}
              </div>
            ) : null}

            {!loading &&
            territories.length === 0 ? (
              <div className="mars-advertiser__empty">
                {t("mars.advertiser.noOwnedTerritories")}
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
                            t("mars.advertiser.territoryFallback")}
                        </strong>

                        <span>
                          {territory.width} ×{" "}
                          {territory.height} /{" "}
                          {territory.pixel_count} {t("mars.advertiser.pixels")}
                        </span>
                      </div>

                      <span className="mars-advertiser__status">
                        {formatStatusLocalized(
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
                        <span>{t("mars.advertiser.views")}</span>
                        <strong>
                          {formatNumber(
                            rowAnalytics?.impressions ??
                              0,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>{t("mars.advertiser.opens")}</span>
                        <strong>
                          {formatNumber(
                            rowAnalytics?.card_opens ??
                              0,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>{t("mars.advertiser.clicks")}</span>
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
                <span>{t("mars.advertiser.campaign")}</span>
                <h2>{t("mars.advertiser.activeCreative")}</h2>
              </div>

              {selectedTerritory ? (
                <span className="mars-advertiser__status">
                  {formatStatusLocalized(
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
                        t("mars.advertiser.creativeAlt")
                      }
                    />
                  ) : (
                    <div className="mars-advertiser__creative-placeholder">
                      {t("mars.advertiser.noCreativeImage")}
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
                        t("mars.advertiser.untitledCreative")}
                    </h3>

                    <p>
                      {selectedTerritory.creative_description ||
                        t("mars.advertiser.noDescription")}
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
                          t("mars.advertiser.explore")}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mars-advertiser__creative-stats">
                  <div>
                    <span>{t("mars.advertiser.impressions")}</span>
                    <strong>
                      {formatNumber(
                        selectedAnalytics?.impressions ??
                          0,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>{t("mars.advertiser.cardOpens")}</span>
                    <strong>
                      {formatNumber(
                        selectedAnalytics?.card_opens ??
                          0,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>{t("mars.advertiser.ctaClicks")}</span>
                    <strong>
                      {formatNumber(
                        selectedAnalytics?.cta_clicks ??
                          0,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>{t("mars.advertiser.ctr")}</span>
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
                    <span>{t("mars.advertiser.allocation")}</span>
                    <strong>
                      {
                        selectedTerritory.allocation_id
                      }
                    </strong>
                  </div>

                  <div>
                    <span>{t("mars.advertiser.colorKey")}</span>
                    <strong>
                      {selectedTerritory.color_key ??
                        t("mars.advertiser.default")}
                    </strong>
                  </div>
                </div>

                <div className="mars-advertiser__manager">
                  <div className="mars-advertiser__manager-head">
                    <div>
                      <span>{t("mars.advertiser.adManager")}</span>
                      <strong>
                        {t("mars.advertiser.manageCreative")}
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
                        ? t("mars.advertiser.closeEditor")
                        : t("mars.advertiser.editAd")}
                    </button>
                  </div>

                  {editorOpen ? (
                    <div className="mars-advertiser__editor">
                      <label>
                        <span>{t("mars.advertiser.adTitle")}</span>
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
                          placeholder={t("mars.advertiser.campaignTitlePlaceholder")}
                        />
                        <small>
                          {creativeTitle.length} /{" "}
                          {contentTier
                            ?.territory_name_max_chars ??
                            "—"}
                        </small>
                      </label>

                      <label>
                        <span>{t("mars.advertiser.description")}</span>
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
                          placeholder={t("mars.advertiser.descriptionPlaceholder")}
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
                          <span>{t("mars.advertiser.creativeImage")}</span>
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
                            {t("mars.advertiser.imageHelp")}
                            {creativeImageFile
                              ? ` · ${creativeImageFile.name}`
                              : ""}
                          </small>
                        </label>
                      ) : null}

                      <label>
                        <span>{t("mars.advertiser.destinationUrl")}</span>
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
                          <span>{t("mars.advertiser.ctaLabel")}</span>
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
                            placeholder={t("mars.advertiser.exploreNow")}
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
                          {t("mars.advertiser.moderatedRevision")}
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
                            ? t("mars.advertiser.submitting")
                            : t("mars.advertiser.saveSubmit")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mars-advertiser__manager-copy">
                      {t("mars.advertiser.managerCopy")}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="mars-advertiser__empty">
                {t("mars.advertiser.selectTerritory")}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
