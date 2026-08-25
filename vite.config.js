import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "typeof window": '"undefined"',
  },
  build: {
    ssr: "src/server.js",
  },
});
