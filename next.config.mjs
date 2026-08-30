/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages: fully static export (functions/ dir adds the API on top)
  output: "export",
  trailingSlash: false,
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
};

export default nextConfig;
