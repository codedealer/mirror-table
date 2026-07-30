---
name: dev-prototype
description: "Use to prototype UI components without authentication or production data in a separate dev-only route."
---

# Development Prototypes

Use `/dev` for UI prototypes that should not require authentication, a table, or any production data. The route is available only while Nuxt runs in development mode; the global route middleware returns a 404 for it in production.

## Add a prototype

1. Add an entry to the `prototypes` array in `pages/dev.vue`. Use a stable kebab-case `id`, a short menu `label`, and a one-sentence `description`.
2. Render the prototype in the page template using the `activePrototype` ID. Keep its state and mock data local unless it has become a reusable production component.
3. The menu link should keep the route shape `/dev?prototype=<id>`. This makes each prototype directly linkable and preserves navigation on refresh.
4. Run `pnpm exec eslint pages/dev.vue layouts/dev.vue middleware/auth.global.ts` after modifying the shell, followed by the most focused additional check available for the prototype.

## Boundaries

- Do not use authenticated stores, Firebase, Google Drive, or real table data in this area.
- Do not add `/dev` to production navigation or public route configuration.
- Keep development-only guards in `middleware/auth.global.ts` so production users receive a 404 even when authenticated.
