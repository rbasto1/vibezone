import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.sh",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "ka2j79ipeh.ufs.sh",
        pathname: "/f/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
