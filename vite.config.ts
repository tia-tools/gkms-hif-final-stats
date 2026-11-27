import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The dev server reads the card data and the images from gkms-library's address, as the live page
// does (src/data/fetch.ts, src/app/images.ts), so it needs the network.
export default defineConfig({
  plugins: [preact(), tailwindcss()],
});
