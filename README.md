# CompareRange

Drop a pin anywhere on the planet and see how far cars, EVs, motorcycles, helicopters, private jets and airliners can get on one tank or one charge — as glowing range rings on a globe. Flip to **Can it get there?**, pick a destination, and see which vehicles make it non-stop and how many stops the rest need.

- 75 vehicles with web-verified headline ranges (EPA for cars, manufacturer max range with reserves for aircraft) in `src/data/vehicles.ts`
- True geodesic circles — they work across the antimeridian, over the poles, and past a quarter of the Earth (`src/geo/geodesy.ts`, tested in `src/geo/geodesy.test.ts`)
- Open-source map stack: [MapLibre GL](https://maplibre.org) + [OpenFreeMap](https://openfreemap.org) vector tiles, [Photon](https://photon.komoot.io) search — no API keys
- Shareable URLs (pin, vehicles, units, mode, projection live in the hash)

## Develop

```bash
nvm use            # Node 22
pnpm install
pnpm dev           # http://localhost:5173
pnpm test          # geodesy unit tests
pnpm build         # static site in dist/
```

## Deploy

Production lives on Vercel (project `compare-range`, team `jpwilsons-projects`) and is mounted at **evlineup.org/compare-range/** through a rewrite in the `eeveecars` project's `vercel.json`. The build uses a relative asset base so it works both at the root and under that sub-path.

```bash
vercel deploy --prod      # from this directory (Vercel CLI, logged in)
```

Pushing to `main` does not auto-deploy unless the Vercel project is connected to the GitHub repo. A `Dockerfile` (Caddy serving `dist/`) and `deploy/deploy.sh` are kept for self-hosting on any Docker box.

## Design

`design/` holds the design-canvas source (`node design/gen.mjs` regenerates the artboards).

Data: © OpenStreetMap contributors, © OpenMapTiles, tiles by OpenFreeMap, search by Photon (komoot).
