/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    // Environment variables will be loaded from .env files automatically by Next.js
    // You can explicitly add defaults here if needed, but it's generally recommended
    // to rely on .env files for sensitive or environment-specific configurations.
  },
  images: {
    unoptimized: true, // Set to false if you need optimized image formats
  },
  // Configure experimental features if needed
  experimental: {
    // appDir: true, // Enable if using App Router
    // serverComponentsExternalPackages: ['react-markdown'], // Example for external packages
  },
  // Add redirects, rewrites, etc. as needed
  async redirects() {
    return [
      // Example redirect:
      // {
      //   source: '/old-path',
      //   destination: '/new-path',
      //   permanent: true,
      // },
    ];
  },
  // Add webpack configuration if needed for custom loaders or plugins
  // webpack: (config, { isServer }) => {
  //   // Modify webpack config here
  //   return config;
  // },
};

module.exports = nextConfig;
