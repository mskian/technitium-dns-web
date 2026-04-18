import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxRuntime: "automatic",
      babel: {
        plugins: mode === "production" ? ["transform-remove-console"] : [],
      },
    }),
    tailwindcss(),
  ],

  build: {
    target: "esnext",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "oxc",
    treeshake: true,

    chunkSizeWarningLimit: 800,
    reportCompressedSize: false,

    rollupOptions: {
      input: {
        // eslint-disable-next-line no-undef
        dns: resolve(__dirname, "index.html"),
      },

      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          // React core only
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/")
          ) {
            return "react-vendor";
          }

          // Lucide icons
          if (id.includes("/node_modules/lucide-react/")) {
            return "icons";
          }

          // Lodash utils
          if (id.includes("/node_modules/lodash/")) {
            return "utils";
          }

          // remaining vendor libs
          return "vendor";
        },

        entryFileNames: "assets/js/[name]-[hash].js",

        chunkFileNames: "assets/js/[name]-[hash].js",

        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
  },

  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react"],
  },
}));
