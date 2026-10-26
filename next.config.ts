import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Приложение целиком за логином и динамическое: классическая модель рендера.
  cacheComponents: false,
  // Для сервера: сборка на GitHub, на сервер едет только готовая папка .next/standalone.
  output: 'standalone',
  // Файлы к подсказкам «?» — до 5 МБ.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
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
