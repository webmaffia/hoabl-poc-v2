/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // msedge-tts opens a raw `ws` WebSocket (see app/api/aira/speech/route.ts).
  // Left un-externalized, Next's webpack server bundle mis-resolves ws's
  // optional native `bufferutil` addon (not installed here) to a stub
  // without a `.mask` export, breaking every WebSocket frame. Excluding both
  // from bundling makes Node's own `require` resolve them normally instead.
  experimental: {
    serverComponentsExternalPackages: ["msedge-tts", "ws"],
  },
};

export default nextConfig;
