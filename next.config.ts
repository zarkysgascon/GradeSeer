const originalWarn = console.warn
console.warn = (...args: any[]) => {
  const msg = args[0]
  if (typeof msg === 'string' && msg.includes('[baseline-browser-mapping]')) return
  originalWarn(...args)
}
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
};

export default nextConfig;
