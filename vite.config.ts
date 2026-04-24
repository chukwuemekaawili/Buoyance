import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5173,
  },
  build: {
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter(
          (dep) => !/(^|\/)(xlsx|pdf|charts|html2canvas\.esm|posthog)-/.test(dep)
        );
      },
    },
    // The app still ships a large route bundle, but vendor-heavy libraries are now split out.
    // Keep the warning threshold aligned with the current architecture until route-level
    // code splitting is introduced.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("xlsx")) return "xlsx";
          if (id.includes("@react-pdf") || id.includes("jspdf")) return "pdf";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@posthog") || id.includes("posthog-js")) return "posthog";
          if (id.includes("recharts")) return "charts";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("date-fns")) return "dates";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("react-hook-form") || id.includes("@hookform/resolvers")) return "forms";
          if (id.includes("react-day-picker")) return "calendar";
          if (id.includes("react-router")) return "router";
          if (id.includes("react-dom") || id.includes("react/jsx-runtime") || /node_modules[\\/]+react[\\/]/.test(id)) {
            return "react-core";
          }
          if (id.includes("@radix-ui")) return "radix";
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
