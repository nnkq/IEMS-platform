import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App";
import "./index.css";

axios.defaults.headers.common["ngrok-skip-browser-warning"] = "true";

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url || "";

  if (!url.startsWith("/api") && !url.startsWith(window.location.origin + "/api")) {
    return nativeFetch(input, init);
  }

  return nativeFetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "ngrok-skip-browser-warning": "true",
    },
  });
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
