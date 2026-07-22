import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import OwnerGate from "./OwnerGate.jsx";
import "./index.css";

document.title = "Меню официанта";

// Простая маршрутизация без библиотек: обычный сайт для официантов живёт на
// корне, а панель владельца — по адресу с хэшем #owner (например,
// https://твой-сайт/#owner). Такой подход не требует настройки серверных
// перенаправлений на GitHub Pages.
const isOwnerRoute = window.location.hash === "#owner";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isOwnerRoute ? <OwnerGate /> : <App />}
  </React.StrictMode>
);
