import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Essential image configuration
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.icons8.com" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "image.uhzcdn.com" },
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "*.googleapis.com" },
      { protocol: "https", hostname: "maps.gstatic.com" },
      { protocol: "https", hostname: "cdn.razorpay.com" },
    ],
  },

  // Basic redirect
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },

  // Essential settings
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;