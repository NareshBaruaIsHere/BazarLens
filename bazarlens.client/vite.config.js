import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { env } from 'node:process';

// Reuse existing Visual Studio certificates when present. A frontend-only
// checkout can run over localhost HTTP without dotnet or certificate creation.
const certificateFolder = env.APPDATA ? path.join(env.APPDATA, 'ASP.NET', 'https') : path.join(env.HOME || '.', '.aspnet', 'https');
const cert = path.join(certificateFolder, 'bazarlens.client.pem');
const key = path.join(certificateFolder, 'bazarlens.client.key');
const https = fs.existsSync(cert) && fs.existsSync(key) ? { cert: fs.readFileSync(cert), key: fs.readFileSync(key) } : undefined;
const target = env.API_PROXY_TARGET || (env.ASPNETCORE_HTTPS_PORT ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}` : env.ASPNETCORE_URLS?.split(';')[0] || 'https://localhost:7089');
export default defineConfig({
  plugins: [plugin()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: Number(env.DEV_SERVER_PORT || 7864),
    https,
    proxy: { '/api': { target, secure: false }, '/weatherforecast': { target, secure: false } },
  },
});
