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

## Deploy (Hetzner or any box with Docker)

```bash
./deploy/deploy.sh root@YOUR.SERVER.IP                # plain HTTP on port 80
./deploy/deploy.sh root@YOUR.SERVER.IP comparerange.com  # automatic HTTPS via Caddy (point DNS first)
```

The script rsyncs the source, builds the image on the box (`Dockerfile` → Caddy serving `dist/`), and starts it with `docker compose`.

## Design

`design/` holds the design-canvas source (`node design/gen.mjs` regenerates the artboards).

Data: © OpenStreetMap contributors, © OpenMapTiles, tiles by OpenFreeMap, search by Photon (komoot).
