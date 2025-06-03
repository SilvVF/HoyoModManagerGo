import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import tailwindcss from "@tailwindcss/vite";

// if in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ReactCompilerConfig = {
  target: '19'
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    babel: {
      plugins: [
        ["babel-plugin-react-compiler", ReactCompilerConfig]
      ]
    }
  }), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      wailsjs: path.resolve(__dirname, "./wailsjs"),
    },
  },
});
