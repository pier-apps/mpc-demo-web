import generouted from "@generouted/react-router/plugin";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), generouted(), nodePolyfills()],
  build: {
    minify: false,
  },
  optimizeDeps: {
    exclude: ["@pier-wallet/mpc-ecdsa-wasm"],
  },
});
