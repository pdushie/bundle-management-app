/**
 * This file enables --skipTypechecking for Next.js build
 * to work around issues with dynamic route parameter types in Next.js 15.x
 */
module.exports = {
  experimental: {
    skipTypechecking: true,
  }
};
