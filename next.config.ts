import type { NextConfig } from "next";
// @ts-ignore - next-pwa doesn't have type definitions
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: process.env.NODE_ENV === "production",
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/app-build-manifest\.json$/, /manifest$/],
  publicExcludes: ['!noprecache/**/*'],
  sw: "sw.js",
  runtimeCaching: [
    {
      // PWA icons and manifest - NetworkFirst with short cache (must be first!)
      urlPattern: /\/(icons\/|apple-touch-icon|favicon|manifest\.json)/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "pwa-assets-v2",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60, // 1 hour (short cache for PWA assets)
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
    {
      // Other images - CacheFirst (excludes PWA icons due to order)
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
})(nextConfig);

export default pwaConfig;
