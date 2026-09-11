import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Chroma-filtered brand artwork needs high-fidelity color edges.
  images: { qualities: [75, 100] },
};

export default withNextIntl(nextConfig);
