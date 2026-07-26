import type { NextConfig } from 'next';

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
// Baked in at build time and shown in the page footer so a device can be checked for a stale
// build. NEXT_PUBLIC_TIMESTAMP can't serve this purpose: it's the data timestamp, rewritten
// only on data uploads, so web-only deploys ship with an unchanged value.
const buildTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

const nextConfig: NextConfig = {
    output: 'export',
    env: {
        NEXT_PUBLIC_BUILD_TIME: buildTime,
    },
    // Emit every route as <route>/index.html (e.g. out/stats/index.html) so Tauri's asset
    // protocol can resolve extensionless paths like /stats — without this it serves stats.html
    // for the file but 404s the directory lookup, leaving the packaged app on a blank screen.
    trailingSlash: true,
};

export default nextConfig;
