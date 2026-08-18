import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (AWS App Runner).
  output: "standalone",
};

export default withNextIntl(nextConfig);
