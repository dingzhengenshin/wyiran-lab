import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "想和你建立情侣关系",
  description: "和我成为情侣，让QQ帮我们记录每日点滴",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
