/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Prevent Next.js from stripping trailing slashes — Django requires them
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        // Proxy all /api/* requests to the Django backend.
        // Always append trailing slash because Django requires it (APPEND_SLASH).
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*/`,
      },
    ];
  },
}

export default nextConfig
