import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH нужен только для GitHub Pages project pages (username.github.io/repo/).
// В GitHub Actions подставляется автоматически, при обычной локальной разработке
// не нужен вообще (по умолчанию "/").
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
});
