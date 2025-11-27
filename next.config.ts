/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  turbopack: {
    // Use the directory of this config file as the Turbopack root
    // this prevents Next.js from inferring an incorrect workspace root
    root: __dirname,
  },
};

export default nextConfig;