import type { UniverseWeather } from "./UniverseState";

export class WeatherEngine {
  private weather: UniverseWeather = "clear";

  setWeather(weather: UniverseWeather): void {
    this.weather = weather;
  }

  getWeather(): UniverseWeather {
    return this.weather;
  }

  reset(): void {
    this.weather = "clear";
  }
}

export const weatherEngine = new WeatherEngine();
