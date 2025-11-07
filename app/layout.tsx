import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "../app/auth-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "TYT Admin", template: "%s | TYT CRM" },
  description: "TYT Admin - Procurement panel",
  keywords: ["Admin", "Procurement panel", "TYT"],
  authors: [{ name: "TYT Team" }],
  creator: "TYT",
  publisher: "TYT",
  formatDetection: { email: false, address: false, telephone: false },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    title: "TYT Admin",
    description: "TYT Admin - Procurement panel",
    siteName: "TYT Admin",
  },
  twitter: {
    card: "summary_large_image",
    title: "TYT Admin",
    description: "TYT Admin - Procurement panel",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
