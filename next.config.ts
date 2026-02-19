import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

/**
 * PWAの設定
 * モバイルのホーム画面に追加した際の挙動やキャッシュを制御します
 */
const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  // 開発環境ではPWAを無効化（デバッグしやすくするため）
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

/**
 * Next.jsの基本設定
 */
const nextConfig: NextConfig = {
  /**
   * Webpackの設定を直接記述することで、Next.js 16のTurbopackによる
   * 自動ビルドを回避し、PWAプラグインが動作する従来の環境を維持します。
   */
  webpack: (config) => {
    // ここにカスタム設定を追加することも可能ですが、
    // 空の状態（configをそのまま返す）でWebpackへの切り替えが発動します。
    return config;
  },
  
  // もしビルドエラーが続く場合の保険として空のexperimental設定を保持
  experimental: {
    // Turbopackを無効化するための空のオブジェクト
    turbopack: {},
  } as any,
};

export default withPWA(nextConfig);