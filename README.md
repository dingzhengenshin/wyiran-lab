# naiwa · 云端奶蛙

An interactive 3D Gaussian Splatting scene: a headphone-wearing frog sitting
above a volumetric cloud sea. The subject, near-cloud veil, and distant clouds
move at different apparent speeds to create depth.

## Development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm test
```

The production build preserves the existing Cloudflare worker wrapper and emits:

- `dist/client` — static site and compressed `.ksplat` assets
- `dist/server/index.js` — SPA fallback worker
- `dist/.openai` — hosting metadata used by the connected deployment
