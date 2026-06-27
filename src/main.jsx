import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import "./styles.css";
import { registerSW } from "virtual:pwa-register";

// Регистрируем service worker; при выходе новой версии обновляем автоматически
registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(<App />);
