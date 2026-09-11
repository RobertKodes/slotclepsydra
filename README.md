# slotclepsydra

Live Solana **mainnet** as a clepsydra — a carved water clock. Not an explorer. Not a dashboard. Not a spa.

You are in the hydraulics bay after hours. The jar drips with the slot clock. Dye in the basin is a sample of recent transactions, stained by program family. Spout glow is fee pressure. Failed txs settle as oxblood sediment and stay. Cap the spout to freeze a sample; while it is held you can tilt the basin and swirl the dye.

Target live: https://robertkodes.github.io/slotclepsydra/

## How to read the clock

| Vessel | Chain |
| --- | --- |
| Drip / hanging drop | Confirmed slot. Extra drops when the sample rate is high |
| Fill of the lower basin | `getRecentPerformanceSamples` TPS, eased |
| Pigment ribbons | Sampled signatures by program family |
| Spout glow, foam, ripple | `getRecentPrioritizationFees` median, log-scaled. Falls back to a dim idle if the meter flakes |
| Oxblood sediment | `err` on a sampled signature. Iron stains linger on the floor |
| CAP / stopper in | Freeze the water. Drag the basin to tilt. Spacebar works |

No wallet. No keys. Browser talks JSON-RPC and drips.

## Palette

Named hex, night workshop, cold stone with a candle on the brass:

| Token | Hex | Use |
| --- | --- | --- |
| **night** | `#101418` | Room pitch |
| **limestone** | `#B7A994` | Vessel, rim, wet stone |
| **basin water** | `#16323C` | Deep water in the bowl |
| **verdigris** | `#3F6F62` | Patina on brass joints |
| **brass** | `#C4A05A` | Spout, hoops, museum plate |
| **candle** | `#E8A03A` | Fee glow |
| **oxblood** | `#7A1E28` | Failed txs / iron sediment |

Pigment dyes (not a seventh brand color):

| Family | Hex |
| --- | --- |
| system | `#D9D0BC` bone |
| token | `#4F9EA3` mineral teal |
| compute | `#8B9A5C` olive mill |
| dex | `#C45A32` copper |
| stake | `#6B5344` umber |
| other | `#4E6A7A` slate mineral |

## Type

- **Fraunces** — catalog title, engraved plate mark. Optical serif, not Inter, not a SaaS geometric.
- **IBM Plex Mono** — slot figures, the CAP rocker. Reads as an instrument, not a terminal theme.

## Layout

Asymmetrical instrument desk: lamp over the left, basin offset, brass plate racked a degree on the right. No centered hero. No three cards. No purple.

## Tinkerer notes

```bash
npm i
npm run dev
```

Vite serves at `/slotclepsydra/`. Open that path, not `/`.

```bash
npm run build
```

must pass. GitHub Actions builds and publishes `dist/` to the `gh-pages` branch (base `/slotclepsydra/`). `public/.nojekyll` rides along so GitHub Pages does not eat the files.

If Pages 404s after merge: GitHub repo Settings → Pages → source **`gh-pages` / root**. The workflow runs on `master` (and `workflow_dispatch`), so the live URL appears after merge, not on the PR branch.

Public RPC, rotating on failure (no keys):

- `solana-mainnet.publicnode.com`
- `solana-rpc.publicnode.com`
- `solana.publicnode.com`
- `api.mainnet-beta.solana.com` (fallback; some networks 403)

Override with `VITE_RPC_URL`. Methods: `getSlot`, `getRecentPerformanceSamples`, `getRecentPrioritizationFees`, a slow rotate of `getSignaturesForAddress` across program lanes, and an occasional `getBlock` with `transactionDetails: "signatures"` for density. If a method 4xxs we stop asking.

`prefers-reduced-motion`: basin still sits on the plinth; drip and swirl stop. Pigment still stamps into the water.

CAP freezes the drip queue. Pull the stopper to resume.
