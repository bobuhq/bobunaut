import type {
  ActiveUniverseTheme,
  UniverseThemeId,
} from "./UniverseTheme";
import {
  resolveUniverseTheme,
  type UniverseThemeOverride,
} from "./UniverseThemeResolver";

type UniverseThemeListener = (
  activeTheme: ActiveUniverseTheme,
) => void;

const THEME_REFRESH_INTERVAL_MS = 60_000;

export class UniverseThemeEngine {
  private activeTheme: ActiveUniverseTheme =
    resolveUniverseTheme();

  private override: UniverseThemeOverride | null = null;

  private listeners = new Set<UniverseThemeListener>();

  private refreshTimer: number | null = null;

  private started = false;

  start(): void {
    if (this.started) return;

    this.started = true;
    this.refresh();

    if (typeof window !== "undefined") {
      this.refreshTimer = window.setInterval(() => {
        this.refresh();
      }, THEME_REFRESH_INTERVAL_MS);
    }
  }

  stop(): void {
    if (
      this.refreshTimer !== null &&
      typeof window !== "undefined"
    ) {
      window.clearInterval(this.refreshTimer);
    }

    this.refreshTimer = null;
    this.started = false;
  }

  getActiveTheme(): ActiveUniverseTheme {
    return this.activeTheme;
  }

  subscribe(listener: UniverseThemeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  setOverride(override: UniverseThemeOverride): void {
    this.override = override;
    this.refresh();
  }

  clearOverride(): void {
    this.override = null;
    this.refresh();
  }

  previewTheme(themeId: UniverseThemeId): void {
    this.setOverride({
      themeId,
      source: "manual",
    });
  }

  refresh(date = new Date()): void {
    const nextTheme = resolveUniverseTheme(
      date,
      this.override,
    );

    const hasChanged =
      nextTheme.theme.id !== this.activeTheme.theme.id ||
      nextTheme.source !== this.activeTheme.source;

    this.activeTheme = nextTheme;
    this.applyCssVariables(nextTheme);

    if (hasChanged) {
      this.listeners.forEach((listener) => {
        listener(nextTheme);
      });
    }
  }

  private applyCssVariables(
    activeTheme: ActiveUniverseTheme,
  ): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const { theme } = activeTheme;

    root.dataset.universeTheme = theme.id;
    root.dataset.universeThemeSource = activeTheme.source;

    root.style.setProperty(
      "--universe-primary",
      theme.palette.primary,
    );
    root.style.setProperty(
      "--universe-secondary",
      theme.palette.secondary,
    );
    root.style.setProperty(
      "--universe-accent",
      theme.palette.accent,
    );
    root.style.setProperty(
      "--universe-glow",
      theme.palette.glow,
    );

    root.style.setProperty(
      "--universe-background-start",
      theme.palette.backgroundStart,
    );
    root.style.setProperty(
      "--universe-background-middle",
      theme.palette.backgroundMiddle,
    );
    root.style.setProperty(
      "--universe-background-end",
      theme.palette.backgroundEnd,
    );

    root.style.setProperty(
      "--universe-nebula-primary",
      theme.palette.nebulaPrimary,
    );
    root.style.setProperty(
      "--universe-nebula-secondary",
      theme.palette.nebulaSecondary,
    );

    root.style.setProperty(
      "--universe-meteor-primary",
      theme.palette.meteorPrimary,
    );
    root.style.setProperty(
      "--universe-meteor-secondary",
      theme.palette.meteorSecondary,
    );
    root.style.setProperty(
      "--universe-meteor-accent",
      theme.palette.meteorAccent,
    );

    root.style.setProperty(
      "--universe-meteor-density",
      String(theme.effects.meteorDensity),
    );
    root.style.setProperty(
      "--universe-particle-density",
      String(theme.effects.particleDensity),
    );
    root.style.setProperty(
      "--universe-glow-intensity",
      String(theme.effects.glowIntensity),
    );
    root.style.setProperty(
      "--universe-celebration-intensity",
      String(theme.effects.celebrationIntensity),
    );
  }
}

export const universeThemeEngine =
  new UniverseThemeEngine();
