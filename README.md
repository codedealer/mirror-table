# Mirror Table

```
This project is in early development stage with some functionality missing or broken
```

Share a virtual canvas with multiple people. A table, controlled by a host, is mirrored to all connected clients. Each table has a set of scenes consisting of various graphic and text elements. It is built with TTRPG in mind, but can be used for any use case that involves presentation of graphic information.

Every element on canvas is represented by an asset that is stored on a host's Google Drive ensuring persistence and easy sharing. Real-time updates are handled by Firebase.

## Setup

This project was built from Vercel Nuxt template, but it is not necessary to deploy it on Vercel. The project can be deployed on any platform that supports Node.js.

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
yarn run dev
```

## Production

Build the application for production:

```bash
yarn run build
```

Locally preview production build:

```bash
yarn run preview
```

Checkout the [deployment documentation](https://v3.nuxtjs.org/guide/deploy/presets) for more information.
