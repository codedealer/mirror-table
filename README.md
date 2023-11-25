# Mirror Table

Share a virtual canvas with multiple people. A table, controlled by a host, is mirrored to all connected clients. Each table has a set of scenes consisting of various graphic and text elements.

Every element on canvas is represented by an asset that is stored on a host's Google Drive ensuring persistence and easy sharing. Real-time updates are handled by Firebase.

## Setup

Make sure to install the dependencies:

```bash
yarn
```

## Development Server

When working on the application it is recommended to install a lint pre-commit hook:

```bash
yarn husky install # First time only
```

Start the development server on http://localhost:3000

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Checkout the [deployment documentation](https://v3.nuxtjs.org/guide/deploy/presets) for more information.
