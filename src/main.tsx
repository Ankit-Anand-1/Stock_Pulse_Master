import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { PortfolioProvider } from "./contexts/PortfolioContext";
import { AlertsProvider } from "./contexts/AlertsContext";

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <PortfolioProvider>
        <AlertsProvider>
          <App />
        </AlertsProvider>
      </PortfolioProvider>
    </AuthProvider>
  </StrictMode>
);

// Register Firebase Messaging Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("Service Worker registered:", registration);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}
