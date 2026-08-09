import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";

if (window.history && window.history.scrollRestoration) {
  window.history.scrollRestoration = "manual";
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
