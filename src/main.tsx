import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./app/App";
import { AuthSessionProvider } from "./core/auth/useAuthSession";
import "./styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthSessionProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthSessionProvider>
  </StrictMode>
);