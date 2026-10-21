import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Приложение целиком за логином и динамическое: классическая модель рендера.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
