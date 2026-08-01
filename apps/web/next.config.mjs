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
};
export default nextConfig;
