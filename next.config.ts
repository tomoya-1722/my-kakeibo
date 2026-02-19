import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Turbopackの代わりにWebpackを明示的に使用するように設定
  webpack: (config) => {
    return config;
  },
  // または、エラーメッセージの指示通りに空のオブジェクトを渡す
  experimental: {
    turbopack: {},
  },
};

export default withPWA(nextConfig);