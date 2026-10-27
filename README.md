# LiveVox Agent

An Admin UI app ("Outbound Engagement Agent") built with React, Vite, TypeScript and the Lyra design system. The page is composed from real `@nicecxone/lyra-ui` components (the Admin "With Page Header" template).

This repo depends on a **sibling** checkout of `lyra-ui` — it is not an installed package:

```
GitHub-Local/
├── lyra-ui/        ← required, next to this folder
└── livevox-agent/  ← this repo
```

## Run locally

Requires [Node.js](https://nodejs.org).

1. In the `lyra-ui` folder: `npm install` (it needs its own packages).
2. In this folder: `npm install`, then `npm run dev`.
3. Open the URL it prints **with the base path**, e.g. `http://localhost:5173/livevox-agent/` — plain `http://localhost:5173` is blank.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` | TypeScript check |
| `npm run deploy` | Build and publish `dist/` to a `gh-pages` branch |

`npm run typecheck` reports 2–3 known errors from inside `lyra-ui` itself (`admin-shell.tsx`, `list-item.tsx`). They are baseline issues in the library, not in this app.

## Publishing

Use GitHub Desktop: **File → Add Local Repository →** pick this folder **→ Publish repository**. For GitHub Pages, `npm run deploy` then set Settings → Pages to the `gh-pages` branch. A CI build would need `lyra-ui` checked out as a sibling too.

## Keeping in sync with lyra-ui

`.lyra-ui-sync` holds the lyra-ui commit this app was built against. See `CLAUDE.md` for the sync-check routine and UI rules.
