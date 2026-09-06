import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./app/App";
import { AuthSessionProvider } from "./core/auth/useAuthSession";
import { ApplicationBootstrap } from "./core/bootstrap";
import { LanguageProvider } from "./core/language";
import { UniverseThemeProvider } from "./core/universe/theme";
import "./styles/global.css";

const CHUNK_RECOVERY_KEY = "bobu:chunk-recovery";

const recoverFromStaleChunk = () => {
  if (sessionStorage.getItem(CHUNK_RECOVERY_KEY) === "1") {
    return;
  }

  sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");

  const url = new URL(window.location.href);
  url.searchParams.set("__bobu_reload", Date.now().toString());

  window.location.replace(url.toString());
};

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverFromStaleChunk();
});

window.addEventListener("unhandledrejection", (event) => {
  const message =
    event.reason instanceof Error
      ? event.reason.message
      : String(event.reason ?? "");

  if (
    /dynamically imported module|module script|loading chunk|failed to fetch/i.test(
      message,
    )
  ) {
    event.preventDefault();
    recoverFromStaleChunk();
  }
});

window.addEventListener("load", () => {
  sessionStorage.removeItem(CHUNK_RECOVERY_KEY);

  const url = new URL(window.location.href);

  if (url.searchParams.has("__bobu_reload")) {
    url.searchParams.delete("__bobu_reload");

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <LanguageProvider>
      <AuthSessionProvider>
        <ApplicationBootstrap>
          <UniverseThemeProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </UniverseThemeProvider>
        </ApplicationBootstrap>
      </AuthSessionProvider>
    </LanguageProvider>
  </StrictMode>
);