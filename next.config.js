/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "drizzle-orm"],
};

module.exports = nextConfig;
