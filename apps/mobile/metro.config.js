const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Metro follows workspace packages in this monorepo. Ignore generated output
// from sibling apps so a concurrent Next.js build cannot invalidate a watched
// directory and crash the mobile development server.
config.resolver.blockList = [
  /[\\/]\.next[\\/].*/,
  /[\\/]\.turbo[\\/].*/,
];

module.exports = config;
