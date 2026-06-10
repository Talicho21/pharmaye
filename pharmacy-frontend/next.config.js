/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination:
          "https://express-pharmaceutical-wholesale.onrender.com/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;