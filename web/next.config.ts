import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Keep postgres.js and native-module packages out of the webpack bundle.
  // instrumentation.ts is compiled for both Node.js and Edge runtimes — the
  // webpack externals below prevent build errors from Node.js-only packages.
  serverExternalPackages: ['postgres'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark postgres (and its native Node.js deps) as external for ALL server
      // compilation targets, including the Edge runtime target used for
      // instrumentation.ts. The runtime guard in instrumentation.ts prevents
      // actual execution in the Edge runtime.
      const existing = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [...existing, 'postgres'];
    }
    return config;
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:4000',
        '*.app.github.dev',
        '*.azurecontainerapps.io',
      ],
    },
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/signin',
        permanent: true,
      },
    ];
  },
  images: {
    dangerouslyAllowSVG: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
