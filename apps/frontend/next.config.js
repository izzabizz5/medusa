/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.oraclecloud.com' },
      { protocol: 'https', hostname: 'i.redd.it' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'preview.redd.it' },
    ],
  },
};

module.exports = nextConfig;
