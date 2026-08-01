/** @type {import('next').NextConfig} */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  experimental: { outputFileTracingRoot: path.join(__dirname, '../../') },
  // Transpile the shared TS core package straight from source (monorepo).
  transpilePackages: ['@supervision-tracker/core'],
  output: 'standalone', // smaller Railway image
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // The shared @supervision-tracker/core package uses NodeNext-style '.js'
    // import specifiers that point at '.ts' source. Teach webpack to resolve them.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};
export default nextConfig;
