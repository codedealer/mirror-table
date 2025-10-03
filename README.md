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

When working on the application it is recommended to install a lint pre-commit hook:

```bash
pnpm exec husky install # First time only
```

Start the development server on http://localhost:3000

```bash
pnpm run dev
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
