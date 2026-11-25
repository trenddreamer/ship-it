import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  // `~/` is app/, from the paths in tsconfig.json.
  resolve: { tsconfigPaths: true },
});
