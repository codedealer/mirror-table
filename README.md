# Mirror Table

```
This project is in early development stage with some functionality missing or broken
```

Share a virtual canvas with multiple people. A table, controlled by a host, is mirrored to all connected clients. Each table has a set of scenes consisting of various graphic and text elements. It is built with TTRPG in mind, but can be used for any use case that involves presentation of graphic information.

Every element on canvas is represented by an asset that is stored on a host's Google Drive ensuring persistence and easy sharing. Real-time updates are handled by Firebase.

## Setup

This project was built from Vercel Nuxt template, but it is not necessary to deploy it on Vercel. The project can be deployed on any platform that supports Node.js.

Make sure to install the dependencies (pnpm is the recommended package manager):

```bash
pnpm install
```

## Development Server

The pre-commit hook is installed automatically during `pnpm install` and runs `lint-staged` before each commit.

Start the development server on http://localhost:3000

```bash
pnpm run dev
```

## Dice Roller Engine

The app includes a dice roller for tabletop games, supporting most common syntax patterns.

The parser is generated from the PEG grammar in `utils/dice-grammar.peggy`. Regenerate it after changing the grammar with:

```bash
pnpm run dice:grammar
```

This runs automatically before `dev`, `build` and `test` (via `predev`/`prebuild`/`pretest`), so you normally don't need to run it manually.

Run the test suite (Vitest, tests colocated as `*.spec.ts` next to their source file, e.g. `utils/dice-parser.spec.ts`) with:

```bash
pnpm run test
```

## Production

Build the application for production:

```bash
pnpm run build
```

Locally preview production build:

```bash
pnpm run preview
```

## Vercel notes

If you deploy to Vercel, the platform may default to older pnpm/Node versions based on project age. To ensure Vercel uses pnpm 10+ and Node 22 (as required by this repo):

- Make sure `package.json` contains the correct engines (for example: `"node": ">=22.20.0"` and `"packageManager": "pnpm@10.18.0"`).
- Add an explicit install step to `vercel.json` so Corepack is enabled during the build:

```json
"installCommand": "corepack enable pnpm && pnpm install"
```

- Additionally, if you see pnpm version errors in Vercel builds, set the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` in the Vercel dashboard to opt in to Corepack during builds.

This ensures the build environment matches local development (Node 22 + pnpm 10).

Checkout the [deployment documentation](https://v3.nuxtjs.org/guide/deploy/presets) for more information.
