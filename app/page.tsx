import type { Metadata } from "next";
import { headers } from "next/headers";
import { LaunchCard } from "./launch-card";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const base = `${protocol}://${host}`;

  return {
    title: "想和你建立情侣关系",
    description: "和我成为情侣，让QQ帮我们记录每日点滴",
    openGraph: {
      title: "想和你建立情侣关系",
      description: "和我成为情侣，让QQ帮我们记录每日点滴",
      type: "website",
      url: base,
      images: [
        {
          url: `${base}/og.png`,
          width: 1200,
          height: 630,
          alt: "想和你建立情侣关系",
        },
      ],
    },
  };
}

export default function Home() {
  return <LaunchCard />;
}
