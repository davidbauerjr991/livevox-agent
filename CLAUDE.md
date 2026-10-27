# LiveVox Agent — Claude instructions

An Admin-style app ("Outbound Engagement Agent") built on the Lyra design system. It consumes `../lyra-ui` (a sibling checkout, not a package) through the `@nicecxone/lyra-ui` alias in `vite.config.ts`.

## Work discipline (Claude)

- Never run `npm install`, builds, or bundlers directly in this mounted folder — copy the repo to your sandbox (exclude `node_modules`/`.git`/`dist`), build and iterate there, and sync only final changed files back here. A sandbox npm install in this folder writes Linux binaries this machine can't run.
- Never write `node_modules`, `dist`, entry files, configs, or temp files into this folder — creating a file here and deleting it later still counts as a violation.
- Never ask the user to run terminal commands.
- Keep context lean: grep/slice big files instead of reading them whole, filter command output through head/grep, compare versions with git diff --stat in the shell, and delegate bulk reading to a subagent — oversized reads slow every later turn in the session.

## UI rules (binding)

All UI follows `../lyra-ui/CLAUDE.md` and `../lyra-ui/CONTRIBUTING.md`. In short: use Lyra components and tokens only (never hard-code colors/spacing/type), and check a component's `.stories.tsx` for real props before using it.

- **Props first, then ask.** Before writing custom UI, find the closest existing Lyra component and check its real props/variants. If nothing fits, stop and ask the user (name what you checked, offer options) — never hide/restyle library internals with CSS, invent props, or hand-build lookalikes.
- Edit only this repo's code. Never modify `../lyra-ui`. Library primitives ("Custom Primitives/", "Headless Primitives/") are protected.
- Lyra tokens are imported exactly once, in `src/main.tsx`. Do not `@import` them again in CSS (a second copy breaks dark mode).
- `tailwind.config.js` takes colors from `../lyra-ui/tailwind-tokens.cjs` — never hand-copy them — and its `content` must keep `../lyra-ui/src/**/*.{ts,tsx}`.
- `npm run typecheck` shows 2–3 known baseline errors from lyra-ui itself (`admin-shell.tsx`, `list-item.tsx`). They're not this repo's fault; zero errors should come from `src/`.

## Sync check (do this first, every session)

`.lyra-ui-sync` records the `lyra-ui` commit this app was last checked against.

1. Confirm `../lyra-ui` exists and is a git repo (`git -C ../lyra-ui rev-parse HEAD`). If missing, skip silently.
2. Diff since last sync: `git -C ../lyra-ui log --oneline "$(cat .lyra-ui-sync)"..HEAD`. Nothing printed → move on.
3. If there are new commits, read `../lyra-ui/PROJECT_SUMMARY.md` (slices, not whole) for what changed, and summarize for the user whether anything here should migrate to a new/changed component.
4. Ask before migrating anything.
5. Once the user has seen and responded, update `.lyra-ui-sync` to lyra-ui's current HEAD.

## GitHub Pages

Served from a project subpath (`https://<user>.github.io/livevox-agent/`), so `vite.config.ts` has `base: "/livevox-agent/"` — keep it equal to the actual repo name. `npm run deploy` builds and pushes `dist/` to a `gh-pages` branch (then set Settings → Pages to that branch, `/ (root)`). A CI-based build would need `lyra-ui` checked out as a sibling too.
