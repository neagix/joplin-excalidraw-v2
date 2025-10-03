import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "src/local-excalidraw"),
  base: './',
  build: {
    chunkSizeWarningLimit: 3000,
    outDir: resolve(__dirname, "dist/local-excalidraw"),
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        manualChunks: undefined,
      },
    },
  },
});
