import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  Check,
  Droplets,
  FlaskConical,
  Hammer,
  PackageOpen,
  ShoppingCart,
  Utensils,
  X,
  Zap,
} from "lucide-react";

import {
  buyMyMarsMarketItem,
  getMyMarsInventory,
  getMyMarsMarket,
  type MarsInventoryItem,
  type MarsMarketItem,
} from "../core/mars/MarsMarketService";

type Props = {
  open: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void | Promise<void>;

  /*
   * Inventory placement begins in the Colony World.
   * MarsMarket only selects the purchased building.
   * The 3D world owns placement coordinates and rotation.
   */
  onPlaceInventoryBuilding?: (
    item: MarsInventoryItem,
  ) => void;
};

type Tab = "market" | "inventory";

function Cost({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  if (value <= 0) {
    return null;
  }

  return (
    <span
      className="mars-market-cost"
      title={label}
    >
      {icon}
      <strong>{value.toLocaleString()}</strong>
    </span>
  );
}

export default function MarsMarket({
  open,
  onClose,
  onPurchaseComplete,
  onPlaceInventoryBuilding,
}: Props) {
  const [tab, setTab] = useState<Tab>("market");

  const [market, setMarket] =
    useState<MarsMarketItem[]>([]);

  const [inventory, setInventory] =
    useState<MarsInventoryItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [buyingItemKey, setBuyingItemKey] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        marketRows,
        inventoryRows,
      ] = await Promise.all([
        getMyMarsMarket(),
        getMyMarsInventory(),
      ]);

      setMarket(marketRows);
      setInventory(inventoryRows);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Mars Market.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void load();
  }, [open, load]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          market.map(
            (item) => item.category,
          ),
        ),
      ),
    [market],
  );

  const handleBuy = async (
    item: MarsMarketItem,
  ) => {
    if (buyingItemKey !== null) {
      return;
    }

    setBuyingItemKey(item.item_key);
    setError(null);

    try {
      await buyMyMarsMarketItem(
        item.item_key,
      );

      await load();

      if (onPurchaseComplete) {
        await onPurchaseComplete();
      }

      setTab("inventory");
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : "Purchase failed.",
      );
    } finally {
      setBuyingItemKey(null);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="mars-market-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="mars-market-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Mars Market"
      >
        <header className="mars-market-header">
          <div>
            <span className="mars-market-eyebrow">
              BOBU MARS
            </span>

            <h2>Mars Market</h2>

            <p>
              Acquire structures and equipment
              for your Colony.
            </p>
          </div>

          <button
            type="button"
            className="mars-market-close"
            onClick={onClose}
            aria-label="Close Mars Market"
          >
            <X size={20} />
          </button>
        </header>

        <div className="mars-market-tabs">
          <button
            type="button"
            className={
              tab === "market"
                ? "is-active"
                : ""
            }
            onClick={() => setTab("market")}
          >
            <ShoppingCart size={17} />
            Market
          </button>

          <button
            type="button"
            className={
              tab === "inventory"
                ? "is-active"
                : ""
            }
            onClick={() =>
              setTab("inventory")
            }
          >
            <PackageOpen size={17} />
            Inventory

            <span>
              {inventory.reduce(
                (total, item) =>
                  total + item.quantity,
                0,
              )}
            </span>
          </button>
        </div>

        {error && (
          <div className="mars-market-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mars-market-loading">
            Loading Colony systems...
          </div>
        ) : tab === "market" ? (
          <div className="mars-market-content">
            {categories.map((category) => {
              const items = market.filter(
                (item) =>
                  item.category === category,
              );

              return (
                <div
                  className="mars-market-category"
                  key={category}
                >
                  <div className="mars-market-category-title">
                    <span>{category}</span>
                    <small>
                      {items.length} ITEMS
                    </small>
                  </div>

                  <div className="mars-market-grid">
                    {items.map((item) => {
                      const buying =
                        buyingItemKey ===
                        item.item_key;

                      const buildingOwned =
                        item.item_type ===
                          "building" &&
                        (item.owned_quantity > 0 ||
                          item.already_constructed);

                      return (
                        <article
                          className="mars-market-card"
                          key={item.item_key}
                        >
                          <div className="mars-market-card-visual">
                            <div className="mars-market-item-icon">
                              {item.item_type ===
                              "building" ? (
                                <Hammer size={28} />
                              ) : (
                                <Box size={28} />
                              )}
                            </div>

                            <span>
                              {item.item_type}
                            </span>
                          </div>

                          <div className="mars-market-card-body">
                            <div className="mars-market-card-heading">
                              <h3>{item.name}</h3>

                              {item.owned_quantity >
                                0 && (
                                <span className="mars-market-owned">
                                  <Check size={13} />
                                  OWNED{" "}
                                  {item.owned_quantity}
                                </span>
                              )}
                            </div>

                            <p>
                              {item.description}
                            </p>

                            <div className="mars-market-costs">
                              <Cost
                                label="Materials"
                                value={
                                  item.materials_cost
                                }
                                icon={
                                  <Box size={14} />
                                }
                              />

                              <Cost
                                label="Energy"
                                value={
                                  item.energy_cost
                                }
                                icon={
                                  <Zap size={14} />
                                }
                              />

                              <Cost
                                label="Water"
                                value={
                                  item.water_cost
                                }
                                icon={
                                  <Droplets
                                    size={14}
                                  />
                                }
                              />

                              <Cost
                                label="Science"
                                value={
                                  item.science_cost
                                }
                                icon={
                                  <FlaskConical
                                    size={14}
                                  />
                                }
                              />

                              <Cost
                                label="Food"
                                value={
                                  item.food_cost
                                }
                                icon={
                                  <Utensils
                                    size={14}
                                  />
                                }
                              />
                            </div>

                            <button
                              type="button"
                              className="mars-market-buy"
                              disabled={
                                buying ||
                                buildingOwned
                              }
                              onClick={() =>
                                void handleBuy(item)
                              }
                            >
                              {buying
                                ? "PURCHASING..."
                                : buildingOwned
                                  ? "IN INVENTORY"
                                  : "BUY"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mars-market-content">
            {inventory.length === 0 ? (
              <div className="mars-market-empty">
                <PackageOpen size={38} />

                <h3>Inventory Empty</h3>

                <p>
                  Purchased Colony equipment
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="mars-inventory-grid">
                {inventory.map((item) => (
                  <article
                    className="mars-inventory-card"
                    key={item.inventory_id}
                  >
                    <div className="mars-market-item-icon">
                      {item.item_type ===
                      "building" ? (
                        <Hammer size={26} />
                      ) : (
                        <Box size={26} />
                      )}
                    </div>

                    <div>
                      <span>
                        {item.item_type}
                      </span>

                      <h3>
                        {item.item_name}
                      </h3>

                      <small>
                        QUANTITY{" "}
                        {item.quantity}
                      </small>
                    </div>

                    {item.item_type ===
                      "building" &&
                      item.quantity > 0 && (
                      <button
                        type="button"
                        className="mars-inventory-place"
                        disabled={
                          !onPlaceInventoryBuilding
                        }
                        onClick={() => {
                          onPlaceInventoryBuilding?.(
                            item,
                          );
                        }}
                        title="Place this building on your Mars Colony."
                      >
                        PLACE
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
