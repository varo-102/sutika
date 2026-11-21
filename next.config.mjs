/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { qualities: [75, 90] },
  async rewrites() {
    return ["/", "/create", "/guia", "/evaluator", "/c/:slug", "/tournaments/:slug"].map((source) => ({
      source,
      destination: "/es" + (source === "/" ? "" : source),
    }));
  },
};
export default nextConfig;
