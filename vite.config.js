import { defineConfig } from "vite";

// Root for development/tests; repository subdirectory for Pages.
export default defineConfig({ base: process.env.PAGES_BASE_PATH || "/" });
