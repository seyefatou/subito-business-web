/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qtrypzzcjebvfcihiynt.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/apps/:path*',
        destination: `${process.env.NEXT_PUBLIC_BASE44_APP_BASE_URL || 'https://api.base44.com'}/api/apps/:path*`,
      },
    ];
  },
};

export default nextConfig;
