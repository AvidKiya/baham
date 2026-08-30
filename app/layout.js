import "./globals.css";
import { DEFAULT_CONFIG } from "../shared/config.mjs";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
export const metadata = {
  title: DEFAULT_CONFIG.text.siteTitle,
  description: DEFAULT_CONFIG.text.siteDesc,
  robots: { index: true, follow: true },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    title: DEFAULT_CONFIG.text.siteTitle,
    description: DEFAULT_CONFIG.text.ogDesc,
    images: ["/assets/og-cover.jpg"],
    ...(siteUrl ? {} : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_CONFIG.text.siteTitle,
    description: DEFAULT_CONFIG.text.siteDesc,
    images: ["/assets/og-cover.jpg"],
  },
  icons: { icon: "/assets/icon-192.png", apple: "/assets/icon-192.png" },
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
};

export const viewport = {
  themeColor: "#0b0715",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
