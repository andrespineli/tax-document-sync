import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve("main.ts"),
      },
    },
    resolve: {
      alias: {
        "@": resolve("src"),
        "@main": resolve("."),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve("preload.ts"),
      },
    },
    resolve: {
      alias: {
        "@": resolve("src"),
        "@main": resolve("."),
      },
    },
  },
  renderer: {
    root: "views",
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve("views/index.html"),
      },
    },
    resolve: {
      alias: {
        "@": resolve("src"),
        "@main": resolve("."),
        "@views": resolve("views/src"),
      },
    },
  },
});
