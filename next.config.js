/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {},
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  // Important for Vercel deployment
  experimental: {
    outputStandalone: true,
  },
};

module.exports = nextConfig;