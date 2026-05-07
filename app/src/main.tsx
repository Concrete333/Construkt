import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import "./index.css";
import App from "./App.tsx";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
