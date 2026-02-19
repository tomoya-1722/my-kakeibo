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
  // Webpackを強制的に使用するように宣言
  webpack: (config) => {
    return config;
  },
  // 一部の環境で必要になる「Turbopack無効化」の空フラグ
  experimental: {
    turbopack: undefined, 
  } as any,
};

export default withPWA(nextConfig);