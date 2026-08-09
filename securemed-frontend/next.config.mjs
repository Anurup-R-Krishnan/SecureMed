/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Prevent Next.js from stripping trailing slashes — Django requires them
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        // Proxy all /api/* requests to the Django backend.
        // Always append a trailing slash: Next.js strips trailing slashes from
        // captured :path* params, so without the append Django receives
        // /api/... without a slash and APPEND_SLASH 500s on POST requests.
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*/`,
      },
    ];
  },
}

export default nextConfig
