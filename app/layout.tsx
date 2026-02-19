import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Next.js 14 標準の Inter フォントを使用
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Kakeibo",
  description: "JCB自動取り込み家計簿",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}