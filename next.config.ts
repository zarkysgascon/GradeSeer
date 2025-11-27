/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  turbopack: {
    // Explicitly set the turbopack root to this project to avoid
    // Next.js inferring the workspace root incorrectly when multiple
    // lockfiles are present.
    // Use an absolute path on Windows to satisfy Next.js requirement.
    root: 'C:\\Users\\gsidr\\Downloads\\GradeSeer\\GradeSeer',
  },
};

export default nextConfig;
