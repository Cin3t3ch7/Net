/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // ─── Edge Runtime Environment Variables ────────────────────────────────────
  // Variables listed here are injected into the Edge runtime (proxy.ts / middleware).
  // They are NOT exposed to the browser. Do NOT add NEXT_PUBLIC_ vars here.
  //
  // UID_COOKIE_SECRET: used by proxy.ts to verify the smartime_uid JWT.
  //   Must match UID_COOKIE_SECRET in backend/.env.
  // REFRESH_TOKEN_COOKIE_NAME: cookie name to check for presence.
  env: {
    UID_COOKIE_SECRET: process.env.UID_COOKIE_SECRET,
    REFRESH_TOKEN_COOKIE_NAME: process.env.REFRESH_TOKEN_COOKIE_NAME,
  },
}

export default nextConfig
