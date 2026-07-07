import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'export',
    // Emit every route as <route>/index.html (e.g. out/stats/index.html) so Tauri's asset
    // protocol can resolve extensionless paths like /stats — without this it serves stats.html
    // for the file but 404s the directory lookup, leaving the packaged app on a blank screen.
    trailingSlash: true,
};

export default nextConfig;
