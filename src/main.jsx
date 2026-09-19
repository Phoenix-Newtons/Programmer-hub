import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import "./index.css";

const container = document.getElementById("root");

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);

// Reassure the console that the app booted (useful when debugging deployments).
if (import.meta.env.DEV) {
  console.info(
    `%c${"Programmer's Hub"}%c dev build ready — press ⌘K to search the hub.`,
    "font-weight:bold;color:#818cf8",
    "color:inherit"
  );
}
