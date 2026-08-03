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

### Standard & Advanced Dice Syntax Matrix

| Syntax | Category | Description | Example Expression | Evaluated Result / Mechanics |
| --- | --- | --- | --- | --- |
| **`NdX`** | **Basic** | Roll $N$ dice with $X$ sides. | `3d6 + 5` | Sum of 3 six-sided dice plus 5. |
| **`khN`** / **`kN`** | **Filter** | Keep Highest $N$ dice. | `4d6kh3` | Rolls 4d6, drops lowest 1, sums top 3. |
| **`klN`** | **Filter** | Keep Lowest $N$ dice. | `2d20kl1` | Standard D&D Disadvantage (keeps lowest 1). |
| **`dlN`** / **`dhN`** | **Filter** | Drop Lowest / Highest $N$ dice. | `4d6dl1` | Equivalent to `4d6kh3`. |
| **`!`** | **Explode** | Explodes on maximum face value. | `3d6!` | Any rolled 6 triggers an extra die roll. |
| **`!N`** / **`!>=N`** | **Explode** | Explodes on conditional threshold. | `1d10!>=8 3d20!19` | Any roll $\ge 8$ on any d10 triggers an extra die. And any roll of exactly 19 on a d20 triggers an extra die |
| **`!p`** / **`![N]`** | **Explode** | Positional target explosion (p = Primary). | `3d6!p 2d10![1]` | Explodes **only** the 1st die in the pool if max. The indexing is 1-based. |
| **`!!`** | **Explode** | Compounding explosion. | `1d6!!` | Extra roll adds directly to single die's face value. |
| **`rN`** / **`r<=N`** | **Reroll** | Reroll die while condition is met. | `1d20r1` | Rerolls any 1 (unlimited times until not 1). |
| **`roN`** | **Reroll** | Reroll die **once** on condition. | `1d20ro1` | Rerolls a 1 once; keeps second result regardless. |
| **`+^N`** / **`bN`** | **Value Shift** | Clamped face value bump (Nimble). | `1d6+^1` | Adds 1 to rolled face value, capped at max sides (6). |
| **`{ ... }`** | **Grouping** | Compound pool with individual rules. | `{1d6!, 2d6} + 2` | Combines a single exploding d6 and 2 standard d6s. |
| **`( ... )`** | **Grouping** | Arithmetic grouping, standard PEMDAS precedence. Distinct from `{ }` pool grouping - never contains dice pools directly, only math. | `(1d6+2)*3` | Adds 2 to the 1d6 roll, then multiplies the sum by 3. |

---

### System Shorthands & Compiler Intent Nodes

These shorthands are parsed into high-level intent nodes and lowered into primitive AST structures by their respective **System Profiles**:

| System Shorthand | Target System | Equivalent Grouped Primitive AST | Purpose / UX Context |
| --- | --- | --- | --- |
| **`nd NdX`** | Nimble 5e | `{1dX!, (N-1)dX}` | Standard Nimble damage roll (Primary die explodes). |
| **`nd NdXaM`** | Nimble 5e | `{(1+M)dXdlM!, (N-1)dX}` | Nimble damage roll with **Advantage** on Primary die. |
| **`nd NdXdM`** | Nimble 5e | `{(1+M)dXdhM!, (N-1)dX}` | Nimble damage roll with **Disadvantage** on Primary die. |
| **`nd NdX + M`** | Nimble 5e | `{1dX!, (N-1)dX} + M` | Nimble damage roll with flat modifier $M$ added. |
| **`NdXaM`** | D&D 5e | `(N+M)dX dl M` | Advantage: roll $M$ extra dice, drop $M$ lowest. $M$ defaults to 1. |
| **`NdXdM`** | D&D 5e | `(N+M)dX dh M` | Disadvantage: roll $M$ extra dice, drop $M$ highest. $M$ defaults to 1. |
| **`std: NdX`** / **`raw: NdX`** | Global (Escape) | `NdX` | Override/Escape hatch to force standard rolling inside a system mode. |

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
